# ccloader3

A mod loader for the game CrossCode by Radical Fish Games.

[![Build Status](https://travis-ci.com/dmitmel/ccloader3.svg?branch=master)](https://travis-ci.com/dmitmel/ccloader3)

A temporary repository for _The Third Version of [CCLoader](https://github.com/CCDirectLink/CCLoader)_.
Project is currently under construction. I promise, [**there will be documentation here**](doc/).

## Features

- Support for overriding assets, like images, sounds, music and JSON data.
- Support for patching existing JSON data assets, like maps.
- Support for mod dependencies, allowing a mod to use other mods.
- Provides multiple hook points during startup where mods can inject code.
- Provides a GUI to enable or disable mods in the CrossCode settings.
- Provides advanced settings, configurable via a JSON config file.
- Provides a debug console even for the NW.js release bundled with the game.

## Installation

TODO

## Usage

Once CCLoader v3 is installed, the game will automatically use it.
Mods must be installed in the `assets/mods` directory.
To disable CCLoader v3, replace `package.json` with the one from the original game.

## How it works

CCLoader v3 starts by trying to load the optional configuration file named
`ccloader-user-config.js` in the main directory.
This file is optional, but if present, it provides ways to [override the default
configuration through code](doc/UserConfig.md).

It then begins its search for mods.  By default, it will look for them in
the `assets/mods` directory.
Each mod must be in a subdirectory.
The name of the subdirectory isn't important, but it must contain a
[`ccmod.json` file](doc/CcmodFile.md).
For backward compatibility with CCLoader v2 mods, a `package.json` file is also
recognised with the old format.
Subdirectories that do not have one of the two files are ignored.

It will then attempt to resolve each mod dependencies to ensure that they
are present, while ignoring mods disabled by the user.  It will also determine
the order in which mods will be loaded.  The dependencies of a mod are always
loaded before the mod itself.

It then proceeds through these [loading phases](doc/LoadingStages.md):

1. Recreate the HTML DOM of the game
2. Load the main class of the mods, if any.
3. Execute the mods' `preload` stage.  It is named as such because it happens
   before the game code is loaded.  The `preload` stage of each mod and all
   further stages are executed in the order in which mods are loaded.
4. Load the game code without executing its entry point.  This will load the
   ImpactJS dependency injection framework, and define all ImpactJS modules
   provided by the game, without initializing them.
5. Execute the mods' `postload` stage.  Mods can make use of the ImpactJS
   dependency injection and the class injection support to modify the game
   before it is started.  See the ImpactJS documentation for details.  Note
   that mods should define their module inline and not in separate files.
6. Start the game, by first indicating to ImpactJS that the DOM is ready, and
   then invoking the `startCrossCode()` entry point.  This will initialize a
   large part of the game which will start loading resources.
7. Execute the mods' `prestart` stage.
8. Wait for the game to finish loading all its resources.
9. Execute the mods' `poststart` stage.
10. Allow the game to continue.

## Modloader API

CCLoader v3 also provides global objects that mods can use at any time:
the `modloader` object and `ccmod` object.

### window.modloader

This provides some access to the internal state of the modloader.
It contains the public fields:
```
// Name of the modloader
name: string = "ccloader",
// Version of the modloader.
version: string = "3.x.x",
// Version of the game.
gameVersion: semver.SemVer,
// Hotfix version of the game.
// If gameVersion is "1.3.0" and gameVersionHotfix is 4, then the complete
// game version is 1.3.0-4.
gameVersionHotfix: number,
// A map from mod ids to the Mod object of each mod.  This map contains all
// detected mods, including mods that are not loaded.
installedMods: Map<string, Mod>,
// A map from mod ids to the Mod object of each mod.  This map only contains
// mods that are loaded or will be loaded.
installedMods: Map<string, Mod>,
// Object used to store wether mods are enabled by the user or not.
modDataStorage: ModDataStorage
```

Mods do not usually need to use it. See the
[detailed documentation](doc/ModloaderAPI.md) for details.

### window.ccmod

This contains a so-called "standard library" for mods, providing various
utilities:
```
// Name of the implementor of the standard library.
implementor: string = "ccloader",
// Name of the implementation of the standard library.
implementation: string = "runtime",
// Provides path manipulation utilities, like nodejs's 'path' module.
paths: PathModule,
// Various javascript utilities.
utils: UtilsModule
// A nodejs-compatible require() that searchs relative to your mod directory.
// Not availlable if the game is run via a browser instead of NW.js
// To load your own code, it is recommended to use import() instead
require: (id: string) : mod
// Provide utilities to run functions as soon as impactjs is initialized
impactInitHooks: ImpactModuleHooksModule,
// Provides utilities to run callback as soon as a impactjs module is loaded
impactModuleHooks: ImpactModuleHooksModule,
// Provides utilities to load resources or dynamically patch them
resources: ResourcesModule
```

See the [detailed documentation for the ccmod API](doc/ccmodAPI.md) for details.