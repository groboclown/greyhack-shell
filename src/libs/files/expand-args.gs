// File Expansion for shell argument handling.

if not globals.hasIndex("FileLib") then globals.FileLib = {}

FileLib.Expand = {}

// Requires:
//import_code("star-glob.gs")
//import_code("paths.gs")

// ExpandFiles() Expands the list of values to files.
//
// Each entry is a map with '.Value', '.Path', '.File'.  '.File' is null if
// the .Value didn't expand to a file, otherwise it's the File object.
// The '.Path' is the file path if found.  '.Value' is the original
// argument value.
//
// The args list is compatible with mc parser arguments.  It allows
// non-named arguments to be expanded if passed with args.Ordered.
FileLib.Expand.ExpandFiles = function(args, computer, home=null, cwd=null)
    ret = []
    for arg in args
        if arg isa map and arg.hasIndex("Value") and (not arg.hasIndex("Name") or arg.Name == null) then arg = arg.Value
        if arg != null and arg isa string then
            star = FileLib.Paths.NormalizeFilename(arg, home, cwd)
            f = computer.File(star)
            if f != null then
                ret.push({"Value": arg, "Name": f.path, "File": f})
                continue
            end if
            found = false
            for match in FileLib.Glob.MatchStar(star, computer)
                f = computer.File(match)
                if f != null then
                    ret.push({"Value": arg, "Name": f.path, "File": f})
                    found = true
                end if
            end for
            if not found then
                ret.push({"Value": arg, "Name": null, "File": null})
            end if
        end if
    end for
    return ret
end function
