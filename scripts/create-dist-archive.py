#!/usr/bin/env python3

import tarfile
from tarfile import TarFile, TarInfo
import zipfile
from zipfile import ZipFile, ZipInfo
import json
import os
from io import BytesIO
import stat
from shutil import copyfileobj
import time

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


with open(os.path.join(PROJECT_DIR, "tool.config.json")) as f:
    MODLOADER_METADATA = json.load(f)

MODLOADER_NAME = MODLOADER_METADATA["name"]
MODLOADER_VERSION = MODLOADER_METADATA["version"]
MODLOADER_DIR_NAME = MODLOADER_NAME

# specific archive extensions are appended when the respective archives are packed
ARCHIVE_NAME_QUICK_INSTALL = "{}_{}_quick-install".format(MODLOADER_NAME, MODLOADER_VERSION)
ARCHIVE_NAME_PACKAGE = "{}_{}_package".format(MODLOADER_NAME, MODLOADER_VERSION)

DEFAULT_FILE_MODE = 0o644
DEFAULT_DIR_MODE = 0o755

PACKAGE_JSON_DATA = {
    "name": "CrossCode",
    "version": "1.0.0",
    "main": MODLOADER_DIR_NAME + "/main.html",
    "chromium-args": " ".join(
        [
            "--ignore-gpu-blacklist",
            "--disable-direct-composition",
            "--disable-background-networking",
            "--in-process-gpu",
            "--password-store=basic",
        ]
    ),
    "window": {
        "toolbar": True,
        "icon": "favicon.png",
        "width": 1136,
        "height": 640,
        "fullscreen": False,
    },
}


class TarGzArchiveAdapter:
    @classmethod
    def open_for_writing(cls, path):
        return cls(TarFile.open(path, "w:gz"))

    def __init__(self, tarfile):
        self._tarfile = tarfile

    def __enter__(self):
        self._tarfile.__enter__()
        return self

    def __exit__(self, type, value, traceback):
        self._tarfile.__exit__(type, value, traceback)

    def add_file_entry(self, name, data):
        self._add_entry(name, tarfile.REGTYPE, DEFAULT_FILE_MODE, len(data), BytesIO(data))

    def add_dir_entry(self, name):
        self._add_entry(name, tarfile.DIRTYPE, DEFAULT_DIR_MODE, 0, None)

    def _add_entry(self, name, type, mode, size, data):
        info = TarInfo(name)
        info.type = type
        info.mode = mode
        info.size = size
        info.mtime = time.time()
        self._tarfile.addfile(info, data)

    def add_real_file(self, path, archived_path, recursive=True):
        self._tarfile.add(
            path, arcname=archived_path, recursive=recursive, filter=self._reset_tarinfo,
        )

    def _reset_tarinfo(self, info):
        # remove user and group IDs as they are irrelevant for distribution and
        # may require subsequent `chown`ing on multi-tenant systems
        info.uid = 0
        info.uname = ""
        info.gid = 0
        info.gname = ""
        return info


class ZipArchiveAdapter:
    @classmethod
    def open_for_writing(cls, path):
        return cls(ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED))

    def __init__(self, zipfile):
        self._zipfile = zipfile

    def __enter__(self):
        self._zipfile.__enter__()
        return self

    def __exit__(self, type, value, traceback):
        self._zipfile.__exit__(type, value, traceback)

    def add_file_entry(self, name, data):
        self._add_entry(name, (stat.S_IFREG | DEFAULT_FILE_MODE) << 16, data)

    def add_dir_entry(self, name):
        if not name.endswith("/"):
            name += "/"
        external_attr = (stat.S_IFDIR | DEFAULT_DIR_MODE) << 16
        external_attr |= 0x10  # MS-DOS directory flag
        self._add_entry(name, external_attr, b"")

    def _add_entry(self, name, external_attr, data):
        info = ZipInfo(name, time.localtime(time.time())[:6])
        info.external_attr = external_attr
        self._set_zipinfo_compression(info)
        self._zipfile.writestr(info, data)

    def add_real_file(self, path, archived_path, recursive=True):
        info = ZipInfo.from_file(
            path, archived_path, strict_timestamps=self._zipfile._strict_timestamps
        )
        self._set_zipinfo_compression(info)

        if info.is_dir():
            self._zipfile.open(info, "w").close()
            if recursive:
                for f in sorted(os.listdir(path)):
                    self.add_real_file(
                        os.path.join(path, f), os.path.join(archived_path, f), recursive=recursive
                    )
        else:
            with open(path, "rb") as src, self._zipfile.open(info, "w") as dest:
                copyfileobj(src, dest, 1024 * 8)

    def _set_zipinfo_compression(self, zipinfo):
        zipinfo.compress_type = self._zipfile.compression
        zipinfo._compresslevel = self._zipfile.compresslevel


for open_archive_fn in [
    lambda name: TarGzArchiveAdapter.open_for_writing(name + ".tar.gz"),
    lambda name: ZipArchiveAdapter.open_for_writing(name + ".zip"),
]:

    def add_modloader_files(archive, archived_path_prefix):
        def add(path, recursive=True):
            archive.add_real_file(
                os.path.join(PROJECT_DIR, path),
                os.path.join(archived_path_prefix, path),
                recursive=recursive,
            )

        add("LICENSE")
        add("main.html")
        add("tool.config.json")
        add("common/", recursive=False)
        add("common/dist/")
        add("common/vendor-libs/")
        add("dist/")
        add("runtime/", recursive=False)
        add("runtime/ccmod.json")
        add("runtime/dist/")
        add("runtime/media/")

    with open_archive_fn(ARCHIVE_NAME_PACKAGE) as archive:
        add_modloader_files(archive, "")

    with open_archive_fn(ARCHIVE_NAME_QUICK_INSTALL) as archive:
        archive.add_file_entry(
            "package.json", (json.dumps(PACKAGE_JSON_DATA, indent=2) + "\n").encode("utf8"),
        )
        archive.add_dir_entry("assets/")
        archive.add_dir_entry("assets/mods/")
        archive.add_dir_entry(MODLOADER_DIR_NAME)

        add_modloader_files(archive, MODLOADER_DIR_NAME)
