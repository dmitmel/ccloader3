# ccmod
This is the global object for APIs that ccloader3 exposes to each mod.

|        Name       |                           Description                          |
|:-----------------:|:--------------------------------------------------------------:|
| implementor       | What software implements the API. Set to "ccloader"            |
| implementation    | Name to distinguish API variations. Set to "ccloader-runtime"  |
| paths             | An API to work with and manipulate urls.                       |
| utils             | Miscellaneous useful methods. Not critical for a mod to use.   |
| require           | For mods that rely on npm modules. Can not be used in browser. |
| semver            | A reference to node-semver v6.3.0 instance.                    |
| patchList         | *                                                              |
| impactInitHooks   | An API for executing code when impact is initialized.          |
| impactModuleHooks | An API for executing code after an impact module is loaded.    |
| resources         | An API for manipulating various game resources.                |