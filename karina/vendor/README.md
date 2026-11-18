# Локальные загрузчики

`loaders/GLTFLoader.js`, `loaders/DRACOLoader.js` и `utils/BufferGeometryUtils.js` взяты из [Three.js r170](https://github.com/mrdoob/three.js/tree/r170/examples/jsm). Изменены только импорты `three`: они указывают на включённый в игру `../../three.module.js`. Лицензия MIT находится в `../THREE-LICENSE.txt`.

`draco/draco_wasm_wrapper.js` и `draco/draco_decoder.wasm` — glTF-декодер из [того же релиза Three.js](https://github.com/mrdoob/three.js/tree/r170/examples/jsm/libs/draco/gltf). Draco распространяется под Apache 2.0, см. `draco/LICENSE.txt`. Для декодирования используется WebAssembly и максимум два worker. Все файлы загружаются с того же сайта, что и игра.
