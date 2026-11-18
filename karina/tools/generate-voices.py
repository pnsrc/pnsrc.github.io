"""Render the committed dialogue as AAC clips using macOS Milena and FFmpeg."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--scratch', type=Path, required=True)
parser.add_argument('--only-missing', action='store_true', help='Keep matching, previously rendered clips')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
args.scratch.mkdir(parents=True, exist_ok=True)
source = json.loads((root / 'voice-lines.json').read_text())
manifest = {}
jobs = []
previous = {}
if args.only_missing and (root / 'voice-manifest.js').exists():
    data = (root / 'voice-manifest.js').read_text().split('export const DIALOGUE = ', 1)[1].strip().removesuffix(';')
    for events in json.loads(data).values():
        for clips in events.values():
            for clip in clips:
                previous[clip['src']] = clip
for character, profile in source.items():
    manifest[character] = {}
    seen = {}
    for event, lines in profile['lines'].items():
        manifest[character][event] = []
        for index, text in enumerate(lines):
            if text not in seen:
                name = f'{event.lower()}-{index}'
                clip = {'text': text, 'src': f'voices/{character}/{name}.m4a'}
                seen[text] = clip
                old = previous.get(clip['src'])
                if old and old['text'] == text and (root / clip['src']).exists():
                    clip['duration'] = old['duration']
                else:
                    jobs.append((character, profile, name, clip))
            manifest[character][event].append(seen[text])

def generate(job):
    character, profile, name, clip = job
    stem = args.scratch / f'{character}-{name}'
    txt = stem.with_suffix('.txt')
    aiff = stem.with_suffix('.aiff')
    txt.write_text(clip['text'])
    subprocess.run(['say', '-v', 'Milena', '-r', str(profile['rate']), '-f', str(txt), '-o', str(aiff)], check=True, capture_output=True)
    details = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=sample_rate,duration', '-of', 'json', str(aiff)]))['streams'][0]
    if float(details.get('duration', 0)) < .15:
        raise RuntimeError(f'Empty synthesized audio: {character}/{name}')
    rate = int(details['sample_rate'])
    pitch = profile['pitch']
    target = root / clip['src']
    target.parent.mkdir(parents=True, exist_ok=True)
    filters = f'asetrate={int(rate*pitch)},aresample=24000,atempo={1/pitch:.5f},highpass=f=90,loudnorm=I=-16:LRA=8:TP=-1.5'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(aiff), '-af', filters, '-ar', '24000', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', str(target)], check=True, capture_output=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(target)]))
    clip['duration'] = round(float(probe['format']['duration']), 3)
    return character, name

with ThreadPoolExecutor(max_workers=3) as pool:
    for index, future in enumerate(as_completed([pool.submit(generate, job) for job in jobs]), 1):
        character, name = future.result()
        print(f'{index}/{len(jobs)} {character}/{name}', flush=True)
(root / 'voice-manifest.js').write_text('// Pre-rendered synthetic dialogue. Regenerate with tools/generate-voices.py.\nexport const DIALOGUE = ' + json.dumps(manifest, ensure_ascii=False, indent=2) + ';\n')
total = len({clip['src'] for events in manifest.values() for clips in events.values() for clip in clips})
print(f'Ready: {total} AAC clips with duration metadata ({len(jobs)} rendered).', flush=True)
