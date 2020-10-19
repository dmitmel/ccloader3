# ccloader3

[![Build Status](https://travis-ci.com/dmitmel/ccloader3.svg?branch=master)](https://travis-ci.com/dmitmel/ccloader3)

A temporary repository for _The Third Version of [CCLoader](https://github.com/CCDirectLink/CCLoader)_. Project is currently under construction. I promise, **there will be documentation here**.

**Precompiled builds can be downloaded from:** https://stronghold.crosscode.ru/~dmitmel/ccloader3/

## Building from source

(This section may be moved in the future)

```bash
cd /somewhere/does/not/matter/where
git clone https://github.com/dmitmel/ultimate-crosscode-typedefs.git
cd ultimate-crosscode-typedefs
npm install
npm link

cd /somewhere/but/preferably/inside/the/crosscode/directory
git clone https://github.com/dmitmel/ccloader3.git
cd ccloader3
npm link ultimate-crosscode-typedefs
npm install
npm run build
```

Then edit the game's `package.json` and point the path in the `main` field to the location of the `main.html` page in the `ccloader3` directory.
