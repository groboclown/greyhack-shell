// Invokes the command-lets.
// Includes argument expansion and simple alias replacement.
// Returns the error results.

// Requires:
// import_code("../../libs/files/paths.gs")
// import_code("../../libs/errors.gs")
// import_code("../../libs/logs.gs")

CmdletManager = {}

CmdletManager.New = function()
    ret = new CmdletManager
    ret.Aliases = {
        "pg": "pagecontroller",
    }
    ret.CmdletPaths = ["~/bin/cmdlets"]
    ret.BinPaths = ["~/bin"]
    ret.SrcDir = "~/src"
    ret.logger = ContextLib.Logger.New("cmdlets")
    return ret
end function

CmdletManager.LoadConfig = function(section)
    self.Aliases = section.StrMap("aliases", self.Aliases)
    self.CmdletPaths = section.StrList("cmdlet-path", self.CmdletPaths)
    self.BinPaths = section.StrList("bin-path", self.BinPaths)
    self.SrcDir = section.Str("src-dir", self.SrcDir)
end function

// Run Runs the command (the parser return value) in the context + session.
CmdletManager.Run = function(cmd, context, session)
    invoke = self.findCommand(cmd, session)
    if invoke == null then
        self.logger.Error("Could not find command {name}", {"name": cmd.Name})
        return -1
    end if
    context.Cmd = invoke.name
    context.Args = invoke.contextArgs
    // print("Running [" + invoke.file.path + "]")
    res = session.Shell.launch(invoke.file.path, self.mkLaunchArgs(invoke.contextArgs, session))
    if res != 1 then
        context.Errors.push(ErrorLib.Error.New("[{cmd}] exited with [{res}]", {"cmd": cmd.Name, "res": res}))
    end if
    self.logger.Debug("Running [{path}] returned [{val}] ({t})", {"path": invoke.file.path, "val": res, "t": typeof(res)})
    if cmd.PromptOnExit then user_input("(press enter to continue)")
    return res
end function

CmdletManager.findCommand = function(cmd, session)
    // For now, just trivial aliasing.  An alias can be an array
    // to force a pre-parsed array list.
    cmdName = cmd.Name
    if self.Aliases.hasIndex(cmdName) then
        cmdName = self.Aliases[cmdName]
        if cmdName isa list then
            cmd.Name = cmdName[0]
            cmd.Args = cmdName[1:] + cmd.Args
            cmdName = cmd.Name
        end if
    end if

    args = CmdletManager.ArgumentSet.New(cmd.Args, session.Computer, session.Home, session.Cwd)

    // Is this an absolute path?
    file = self.getBinFile(cmdName, session)
    if file != null then
        return {"file": file, "contextArgs": args, "name": file.path}
    end if

    // Is this a commandlet?
    file = self.findInPath(cmdName, self.CmdletPaths, session)
    if file != null then
        return {"file": file, "contextArgs": args, "name": file.path}
    end if
    file = self.findInPath(cmdName, self.BinPaths, session)
    if file != null then
        return {"file": file, "contextArgs": args, "name": file.path}
    end if
    return null
end function

CmdletManager.mkLaunchArgs = function(args, session)
    ret = []
    for arg in args.Ordered
        argVal = arg.Value
        // Ignore arguments that can't be used as a launch argument.
        // An argument like "{name}" generates the error "Invalid character '{' in program parameters"
        if argVal.indexOf("{") == null and argVal.indexOf("[") == null then
            ret.push(argVal)
        end if
    end for
    joined = ret.join(" ")
    return joined
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

// TODO script file - building and executing them.

CmdletManager.ArgumentSet = {}
CmdletManager.ArgumentSet.New = function(argList, computer, home, cwd)
    ret = new CmdletManager.ArgumentSet()
    ret.Original = argList

    // Expanded with files
    ret.Ordered = []

    // Helpful standard argument parsing convention.
    ret.Unnamed = []
    // The "Named" ones are the name -> NamedValueArgument
    ret.Named = {}

    // And capture arguments that point to files.
    ret.Files = []

    lastWasDash = false
    for arg in argList
        split = CmdletManager.splitArgument(arg)
        if split[0] == "--" then
            ret.Ordered.push(CmdletManager.NamedValueArgument.New(null, arg[0], arg, null))
            lastWasDash = true
            continue
        end if

        // If this is a short argument form, then there's no file parsing.
        if not lastWasDash and split[3] != null then
            ret.Ordered.push(CmdletManager.NamedValueArgument.New(null, arg[0], arg, null))
            for n in split[3]
                ret.Named[n] = CmdletManager.NamedValueArgument.New(n, null, split[0], null)
            end for
            lastWasDash = false
            continue
        end if

        // Expand the value.
        // Take into account the "--" that may proceed it.
        name = split[1]
        value = split[2]
        if value == null then value = split[0]
        if lastWasDash then
            name = null
            value = split[0]
        end if
        lastWasDash = false

        if value != null and value.len > 0 then
            // Perform file expansion
            star = FileLib.Paths.NormalizeFilename(value, home, cwd)
            // Check if this expanded to an exact filename.
            f = computer.File(star)
            if f != null then
                parg = CmdletManager.NamedValueArgument.New(name, f.path, arg, f)
                ret.Ordered.push(parg)
                if name == null then
                    ret.Unnamed.push(parg)
                    ret.Files.push(f)
                else
                    ret.Ordered.push(parg)
                    ret.Named[name] = parg
                end if
                continue
            end if
            // Look for glob matching
            found = false
            for match in FileLib.Glob.MatchStar(star, computer)
                f = computer.File(match)
                if f != null then
                    parg = CmdletManager.NamedValueArgument.New(name, f.path, arg, f)
                    ret.Ordered.push(parg)
                    if name == null then
                        ret.Unnamed.push(parg)
                        ret.Files.push(f)
                    else
                        ret.Ordered.push(parg)
                        ret.Named[name] = parg
                    end if
                    found = true
                end if
            end for
            if not found then
                parg = CmdletManager.NamedValueArgument.New(name, star, arg, null)
                ret.Ordered.push(parg)
                if name == null then
                    ret.Unnamed.push(parg)
                else
                    ret.Named[name] = parg
                end if
            end if
        else if name != null and name.len > 0 then
            // No value, so just set the name
            parg = CmdletManager.NamedValueArgument.New(name, value, arg, null)
            ret.Ordered.push(parg)
            ret.Named[name] = parg
        else
            // Just add it to the ordered list, whatever it is.
            parg = CmdletManager.NamedValueArgument.New(null, arg, arg, null)
            ret.Ordered.push(parg)
            // And the unnamed list.
            ret.Unnamed.push(parg)
        end if
    end for

    ret.Empty = ret.Ordered.len <= 0
    ret.UnnamedEmpty = ret.Unnamed.len <= 0
    ret.FilesEmpty = ret.Files.len <= 0
    return ret
end function

CmdletManager.ArgumentSet.ContainsValue = function(name)
    return self.ValueSet.hasIndex(name)
end function

CmdletManager.ArgumentSet.GetNamed = function(name)
    if self.Named.hasIndex(name) then
        val = self.Named[name].Value
        if val == null then return true
        return val
    end if
    return null
end function

CmdletManager.NamedValueArgument = {}
CmdletManager.NamedValueArgument.New = function(name, value, original, file)
    ret = new CmdletManager.NamedValueArgument
    ret.Name = name
    ret.Value = value
    ret.Original = original
    ret.File = file
    return ret
end function

// splitArgument() splits an argument text into [original, name, value, name-parts]
CmdletManager.splitArgument = function(text)
    if text.len == 0 or text == "--" then return [text, null, null, null]
    if text.len > 2 and text[:2] == "--" then
        // --longname or --longname=value style.
        p = text.indexOf("=")
        if p != null and p > 0 then
            return [text, text[2:p], text[p+1:], null]
        else
            return [text, text[2:p], null, null]
        end if
    end if
    if text.len > 1 and text[:1] == "-" then
        // single character style
        return [text, null, null, text[1:].values]
    end if
    return [text, null, null, null]
end function
