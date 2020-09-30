CCLoader v3 will look for a file named `ccloader-user-config.js` inside
the game root directory (the one containing `package.json` and
`tool.config.json`).

This file should export a default function with two parameters as follow:
```
export default function(config, context) {
    // modify config here
}
```

`context` only contains two fields: `modloaderName` and `modloaderVersion`.
They are equal to `modloader.name` and `modloader.version` respectively, except
`modloader` is not available in this function.


`config` comes with the following modifiable members:
- `gameAssetsDir : string`: Where CCLoader v3 will load assets.
  The default is `assets/`.
- `modsDir : string[]`: List of directories where CCLoader v3 will search mods.
  The default is `["assets/mods/"]`
- `stylesheetURLs : string[]`,
  List of stylesheet URLs to reference in the constructed DOM.
  The default value of `stylesheetURLs` contains the same URLs that are
  referenced in the original `assets/node-webkit.html` HTML file from the game,
  but in the following order:
  ```
  ['impact/page/css/ui-darkness/jquery-ui-1.10.2.custom.min.css',
   'impact/page/css/style.css',
   'game/page/game-base.css']
  ```
  It is recommended to not rely on this order or index, as it may be updated
  as the game evolves.

- `scriptURLs : string[]`: List of javascript files to put in `<script>` tags
  in the constructed DOM.  This list should not contain the game's main code,
  as it is handled separately.
  Likewise for `stylesheetURLs`, the default values are unchanged from the
  game, but are in the following order:
  ```
  ['impact/page/js/aes.js',
   'impact/page/js/seedrandom.js',
   'impact/page/js/jquery-1.11.1.min.js',
   'impact/page/js/jquery-ui-1.10.2.custom.min.js',
   'game/page/game-base.js',
   'impact/page/js/options.js']
  ```

- `gameScriptURL: string`: URL to the game's main code.  The default is
  `js/game.compiled.js`.  Note that this code in hooked into by CCLoader v3 in
  various ways.

- `impactConfig: Record<string, unknown>`: Contains global variables used by
  ImpactJS and/or by the game.  The default are the same as in the original
  `assets/node-webkit.html`:
  ```
  {IG_GAME_SCALE: 2,
   IG_GAME_CACHE: 0,
   IG_ROOT: '',
   IG_WIDTH: 568,
   IG_HEIGHT: 320,
   IG_HIDE_DEBUG: false,
   IG_SCREEN_MODE_OVERRIDE: 2,
   IG_WEB_AUDIO_BGM: false,
   IG_FORCE_HTML5_AUDIO: false,
   LOAD_LEVEL_ON_GAME_START: null,
   IG_GAME_DEBUG: false,
   IG_GAME_BETA: false}
  ```

- `onGameDOMCreated: async () : void`: A (possibly async) function that
  CCLoader v3 will call after recreating the DOM, but before loading the
  stylesheets and scripts.
