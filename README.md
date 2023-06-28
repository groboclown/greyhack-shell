# Grey Script - The Grey Hack Shell

`ghsh` is the Grey Hack game enhanced shell.

It's assembled using the [greyhack-importer](https://github.com/groboclown/greyhack-importer).

## MC Shell

Read [the docs](mc.md).

## Game File Layout

This repository expects the files in the game to be laid out just like the repository.


## Coding Standard

In general, a Go coding standard is used for comments and naming.

### Classes

Classes use functions named "New*" to create new instances, and "init" as initializers.  For an example, see the [extract.gs](programs/extract.gs) program.

If a class provides a string representation, it should do so in the ".Text" value or function.

### Errors

Functions that can generate an error return a list: [error, result].  The "error" is `null` if there is no error, otherwise it's something that should be displayable to the end user.


### Library: Context

(Still needs to be documented.  The rough sketch of the library and its use is in the monitor program.)
