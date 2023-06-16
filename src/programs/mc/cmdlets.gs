// Invokes the command-lets.
// Returns the error results.

// Requires:
// import_code("../../libs/files/paths.gs")

CmdletManager = {}

CmdletManager.New = function()
    ret = new CmdletManager
    ret.Aliases = {
        "+": "pagecontroller",
    }
    ret.CmdletPaths = ["~/bin/cmdlets"]
    ret.BinPaths = ["~/bin"]
    ret.SrcDir = "~/src"
    return ret
end function

CmdletManager.LoadConfig = function(section)
    // self.Aliases
    self.CmdletPaths = section.StrList("cmdlet-dir", self.CmdletPaths)
    self.BinPaths = section.StrList("bin-dir", self.BinPaths)
    self.SrcDir = section.Str("src-dir", self.SrcDir)
end function

CmdletManager.Run = function(cmd, context, session)
    invoke = self.findCommand(cmd, session)
    if invoke == null then
        ContextLib.Log("error", "Could not find command " + cmd.Name)
        return -1
    end if
    context.Cmd = invoke.name
    context.Args = invoke.contextArgs
    print("Running [" + invoke.file.path + "] [" + invoke.args + "]")
    res = session.shell.launch(invoke.file.path, invoke.args)
    ContextLib.Log("info", "Running [{path}] returned [{val}]", {"path": invoke.file.path, "val": res})
    // FIXME for now...
    if res != 0 then
        print("Exited with " + res)
        exit
    end if
    return res
end function

CmdletManager.findCommand = function(cmd, session)
    // For now, just trivial aliasing.
    cmdName = cmd.Name
    if self.Aliases.hasIndex(cmdName) then cmdName = self.Aliases[cmdName]

    // Is this a commandlet?
    file = self.findInPath(cmdName, self.CmdletPaths, session)
    if file != null then
        return {"file": file, "args": "", "name": cmd.Name, "contextArgs": cmd.Args}
    end if
    file = self.findInPath(cmdName, self.BinPaths, session)
    if file != null then
        // FIXME FullArgs needs to be something real.
        return {"file": file, "args": cmd.FullArgs, "name": file.path, "contextArgs": []}
    end if
    return null
end function

// CmdletManager.findInPath() Find the binary in one of the paths (array of strings)
//
// Returns the file object, or null
CmdletManager.findInPath = function(cmdName, paths, session)
    for parent in paths
        filename = FileLib.Paths.NormalizeFilename(parent + "/" + cmdName, session.home, session.cwd)
        file = session.computer.File(filename)
        if file != null and not file.is_folder and file.is_binary then return file
        print("Did not find [" + filename + "]")
    end for
    return null
end function
