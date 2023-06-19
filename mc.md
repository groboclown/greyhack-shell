# MC Shell for Grey Hack

A shell replacement tool.


# Authoring Cmdlets

The command-lets are programs that run from the MC tool.  They expect work with the MC tool through the `ContextLib.Get()` call and related conventions.

In addition to the usual conventions, it will also have the value `Cmd` be set to the name of the command-let invoked, and `Args` be set to the command argument list (a list of [`ParsedCommand.Argument`](src/programs/mc/parser.gs) values).

Sending output to the user must be done through the `ContextLib.Log` function.
