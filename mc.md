# MC Shell for Grey Hack

A shell replacement tool.

## Syntax

The tool uses usual Unix like shell syntax for launching commands - the command name then the arguments for the command.

For example:

```bash
echo The Text
```

will run the `echo` cmdlet with the argument `The` and `Text`.  Arguments can be joined together by quoting them:

```bash
echo "The Text" 'And More Text'
```

will run the `echo` cmdlet with the two arguments `The Text` and `And More Text`.


# Authoring Cmdlets

The command-lets are programs that run from the MC tool.  They expect work with the MC tool through the `ContextLib.Get()` call and related conventions.

In addition to the usual conventions, it will also have the value `Cmd` be set to the name of the command-let invoked, and `Args` be set to the parsed command arguments.

Sending output to the user must be done through the `ContextLib.Log` function.  Errors can be posted by adding an [`ErrorLib.Error`](src/libs/errors.gs) to the `context.Errors`.
