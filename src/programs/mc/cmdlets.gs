// Invokes the command-lets.
// Returns the error results.

// Requires:
// import_code("../../libs/files/paths.gs")
// import_code("../../libs/errors.gs")

CmdletManager = {}

CmdletManager.New = function()
    ret = new CmdletManager
    ret.Aliases = {
        "pg": "pagecontroller",
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
    // TODO the cmd.Args can include a sub-command that needs to run first and
    //   have its result be passed to the main command.

    invoke = self.findCommand(cmd, session)
    if invoke == null then
        ContextLib.Log("error", "Could not find command " + cmd.Name)
        return -1
    end if
    context.Cmd = invoke.name
    context.Args = invoke.contextArgs
    // print("Running [" + invoke.file.path + "] [" + invoke.launchArgs + "]")
    // res = session.Shell.launch(invoke.file.path, invoke.launchArgs)
    res = session.Shell.launch(invoke.file.path, self.mkLaunchArgs(cmd, session))
    if res != 1 then
        context.Errors.push(ErrorLib.Error.New("[{cmd}] exited with [{res}]", {"cmd": cmd.Name, "res": res}))
    end if
    ContextLib.Log("debug", "Running [{path}] returned [{val}] ({t})", {"path": invoke.file.path, "val": res, "t": typeof(res)})
    if cmd.PromptOnExit then user_input("(press enter to continue)")
    return res
end function

CmdletManager.findCommand = function(cmd, session)
    // For now, just trivial aliasing.
    // This needs to be plugged back into the parser.
    cmdName = cmd.Name
    if self.Aliases.hasIndex(cmdName) then cmdName = self.Aliases[cmdName]

    // Is this an absolute path?
    file = self.getBinFile(cmdName, session)
    if file != null then
        return {"file": file, "contextArgs": CmdletManager.ArgumentSet.New(cmd.Args), "name": file.path}
    end if

    // Is this a commandlet?
    file = self.findInPath(cmdName, self.CmdletPaths, session)
    if file != null then
        return {"file": file, "contextArgs": CmdletManager.ArgumentSet.New(cmd.Args), "name": file.path}
    end if
    file = self.findInPath(cmdName, self.BinPaths, session)
    if file != null then
        return {"file": file, "contextArgs": CmdletManager.ArgumentSet.New(cmd.Args), "name": file.path}
    end if
    return null
end function

CmdletManager.mkLaunchArgs = function(cmd, session)
    ret = []
    for arg in cmd.Args
        val = arg.Original
        if val.indexOf("*") != null then
            // file expansion for free.
            for item in FileLib.Expand.ExpandFiles([val], session.Computer, session.Home, session.Cwd)
                if item.Name != null then
                    ret.push(item.Name)
                else
                    ret.push(item.Value)
                end if
            end for
        else
            ret.push(val)
        end if
    end for
    return ret.join(" ")
end function

// CmdletManager.findInPath() Find the binary in one of the paths (array of strings)
//
// Returns the file object, or null
CmdletManager.findInPath = function(cmdName, paths, session)
    for parent in paths
        file = self.getBinFile(parent + "/" + cmdName, session)
        if file != null then return file
    end for
    return null
end function

CmdletManager.getBinFile = function(cmdName, session)
    filename = FileLib.Paths.NormalizeFilename(cmdName, session.Home, session.Cwd)
    file = session.Computer.File(filename)
    if file != null and not file.is_folder and file.is_binary then return file
    // print("Did not find [" + filename + "]")
    return null
end function


CmdletManager.ArgumentSet = {}
CmdletManager.ArgumentSet.New = function(argList)
    ret = new CmdletManager.ArgumentSet()
    ret.Ordered = argList
    ret.Count = argList.len
    ret.Named = {}
    ret.ValueSet = {}
    ret.Empty = argList.len <= 0
    for arg in argList
        if arg.Name != null then ret.Named[arg.Name] = arg.Value
        ret.ValueSet[arg.Value] = true
    end for
    return ret
end function

CmdletManager.ArgumentSet.ContainsValue = function(name)
    return self.ValueSet.hasIndex(name)
end function

CmdletManager.ArgumentSet.GetNamed = function(name)
    if self.Named.hasIndex(name) then return self.Named[name]
    return null
end function
