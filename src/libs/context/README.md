# The context shared object

This library constructs a uniform method for obtaining and accessing the `get_custom_object`, to allow for standard methods for inter-process communication.

The library is broken into tiny bits to make importing only bring in the minimal required functionality.

## Overview

The context object provides inter-process communication primitives through the "pages" concept.

