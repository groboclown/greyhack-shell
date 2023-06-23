# The context shared object

This library constructs a uniform method for obtaining and accessing the `get_custom_object`, to allow for standard methods for inter-process communication.

The library is broken into tiny bits to make importing only bring in the minimal required functionality.

## Overview

The context object provides inter-process communication primitives through the "pages" concept.  It also provides a collection of "session" objects that represent a login to a computer + some terminal information.

## Errors

To better share errors between calls and persist them for the user to examine, the context contains the `Errors` value, which is a list of values.

## Console

The console ("terminal") is extremely limited in Grey Hack.  As a result, many standard features are simulated in the context shared object.

* `Console.Width` - intended to be the number of columns horizontally that can be displayed on a single line in the terminal.  However, because there is no direct way to read this information, the user must provide the best option.  A good default is given.
* `Console.Height` - same thing as width, but for the number of viewable rows in the terminal without scrolling.

## Pages

A "page" in the context object has these aspects:

* Name: Each page has its own name.  These usually represent the purpose of the page or the program managing the page.  These are shared between all sessions.
* Rows: A page contains an ordered list of rows, which are themselves maps of named fields.  The field values should be simple values (strings, numbers, booleans), but can be anything.  However, it's highly recommended to make them strongly typed.  This is stored in the context `Pages` attribute.
* Meta-data: a description of the fields that the page contains.  The meta-data for a page contains:
    * `Default` - (optional) a string with the default field used to indicate which field is the primary usage - for example, a file list page may use the file path as the default field instead of file size.
    * `Description` - (optional) a string describing what the page is for.
    * `Text` - (optional) a function that accepts the whole row as an argument and returns a human readable string.  Without this, the row field should have a 'Text' entry to make human readable versions of the row.
    * `Fields` - A map, keyed with each row's field name to a map of information about the row.

The `Fields` in the meta-data has a special set of conventions to help with dynamic inspection tools.  Specifically, it can have these keys:

* `Description` - a string that describes the field.  Useful for help screens.
* `Order` - a number that indicates in what order to display this field.  It's assumed that fields without an Order will not be displayed.  It's also assumed that these start at 1 and are strictly increasing by 1.  That is, if a field as 1 and another has 3, then there should be one with 2.
* `Color` - a string for the color to display this field (e.g. `#a0ff20`).  This can also be a function, in which case it's passed the whole row, and returns the field's display color.
* `Width` - a number representing a hint at how many characters the field should take up.  Useful for tabular display of the field.
* `Text` - if given, a function that's passed the field's value, and returns a string to display.

In many ways, because the tools cannot pipe output to each other through file descriptors like in Unix tools, the Page becomes the method of communication.  It adds a bit more robustness to the data than a simple stream, which makes communication a bit easier.

## Sessions

A "session" contains information about a logged in server.  The "local" name is a hard-coded for the session that started the original program.

Each session object contains:

* `ip`: IP address of the session.  If local, then this is `null`.
* `parent`: Parent session name that created the session.  May be `null`.
* `user`: User logged into the session.
* `password`: Password that connected to the session.  May be `null`.
* `home`: Home directory of the user logged into the session.
* `shell`: Shell object for the logged in user.  May be `null` if the shell is logged out.
* `computer`: Host computer object for the shell.
* `cwd`: Current working directory for the shell within the session.
* `env`: Environment variables for the session.  These are not explicitly inherited between sessions.
* `on_logout`: If non-null, this is a function that runs at the start of the the session logout function, before the logout happens.  The function will be bound to the session object, so it can use `self.` to reference the session object.
* `on_logout_post`: If non-null, this is a function that runs at the end of the the session logout function, after the logout happens.  The function will be bound to the session object, so it can use `self.` to reference the session object.
* `on_cmd`: If non-null, this is a function that runs at the start of running a command-let.  If the session needed to log in, this happens after the login.  The function will be bound to the session object, so it can use `self.` to reference the session object.
* `on_cmd_post`: If non-null, this is a function that runs at the end of running a command-let.  The function will be bound to the session object, so it can use `self.` to reference the session object.
* `on_login`: If non-null this is a function that runs after an implicit login (something uses the session when it's logged out).  The function will be bound to the session object, so it can use `self.` to reference the session object.

As a good practice, when calling into another program that will use a different session, you should use the context `CurrentSessionName` field to reference the name it should use as its current session:

```miniscript
selfSession = context.CurrentSessionName
context.CurrentSessionName = "New Session"
callOtherProgram(context)
context.CurrentSessionName = selfSession
```
