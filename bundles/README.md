# Bundles

This directory contains bundles for assembling "gs-tar" files to add into the Grey Hack game.  They use the [`gs_tar.py`](../bin/gs_tar.py) Python program to construct the bundle, and the [`extract`](../src/programs/gs-tar/extract.gs) Grey Hack script to unpack.

The bundles act like small build scripts.  They must be JSON formatted arrays, containing ordered blocks of tasks.
