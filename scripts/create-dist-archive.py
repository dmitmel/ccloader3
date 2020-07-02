#!/usr/bin/env python3

import tarfile
from tarfile import TarFile, TarInfo
import json
import os
import io

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


with open(os.path.join(PROJECT_DIR, "tool.config.json")) as f:
    MODLOADER_METADATA = json.load(f)

MODLOADER_NAME = MODLOADER_METADATA["name"]
MODLOADER_VERSION = MODLOADER_METADATA["version"]
MODLOADER_DIR_NAME = MODLOADER_NAME

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


def add_file_to_tar(archive, name, data, size):
    tarinfo = TarInfo(name)
    tarinfo.type = tarfile.REGTYPE
    tarinfo.mode = 0o644
    tarinfo.size = size
    archive.addfile(tarinfo, data)


def add_text_file_to_tar(archive, name, data):
    add_file_to_tar(archive, name, io.BytesIO(data.encode("utf8")), len(data))


def add_dir_to_tar(archive, name):
    tarinfo = tarfile.TarInfo(name)
    tarinfo.type = tarfile.DIRTYPE
    tarinfo.mode = 0o755
    tarinfo.size = 0
    archive.addfile(tarinfo)


def add_modloader_files_to_tar(archive, path_prefix):
    def my_tarinfo_filter(info):
        # remove user and group IDs as they are irrelevant for distribution and
        # may require subsequent `chown`ing on multi-tenant systems
        info.uid = 0
        info.uname = ""
        info.gid = 0
        info.gname = ""

        # TODO: generate mtime for the generated files in the quick-install
        # archive, then bring back mtimes for modloader files as well.
        info.mtime = 0

        return info

    def add_real_file(path, recursive=True):
        archive.add(
            os.path.join(PROJECT_DIR, path),
            arcname=path_prefix + path,
            recursive=recursive,
            filter=my_tarinfo_filter,
        )

    add_real_file("LICENSE")
    add_real_file("main.html")
    add_real_file("tool.config.json")
    add_real_file("common/", recursive=False)
    add_real_file("common/dist/")
    add_real_file("common/vendor-libs/")
    add_real_file("dist/")
    add_real_file("runtime/", recursive=False)
    add_real_file("runtime/ccmod.json")
    add_real_file("runtime/dist/")
    add_real_file("runtime/media/")


with TarFile.open(
    "{}_{}_package.tar.gz".format(MODLOADER_NAME, MODLOADER_VERSION), "w:gz"
) as tar:
    add_modloader_files_to_tar(tar, "")

with TarFile.open(
    "{}_{}_quick-install.tar.gz".format(MODLOADER_NAME, MODLOADER_VERSION), "w:gz",
) as tar:
    add_text_file_to_tar(
        tar, "package.json", json.dumps(PACKAGE_JSON_DATA, indent=2) + "\n"
    )
    add_dir_to_tar(tar, "assets/")
    add_dir_to_tar(tar, "assets/mods/")
    add_dir_to_tar(tar, MODLOADER_DIR_NAME)
    add_modloader_files_to_tar(tar, MODLOADER_DIR_NAME + "/")
