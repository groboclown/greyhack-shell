// Simple Operating System Extensions
//#requires files/paths.gs

if not globals.hasIndex("FileLib") then globals.FileLib = {}


// MkDir() Create a single directory.  Takes a string argument or a path list.
//
// Returns [error] list; if there is an error, then the first item in the
// list is an error message.
FileLib.MkDir = function(path)
    if path isa string then
        parts = FileLib.Paths.NormalizePath(self.SplitPath(path))
    else if path isa list then
        parts = FileLib.Paths.NormalizePath(path)
    else
        print("Error: invalid argument")
        return 1
    end if
    if parts.len <= 0 then return 0
    base = FileLib.Paths.JoinPath(parts[:-1])
    sub = parts[-1]
    fullname = FileLib.Paths.JoinPath(parts)
    f = host.File(fullname)
    if f != null and ! f.is_folder then
        print("Error: path exists and is not a folder: " + fullname)
        return 1
    end if
    if f == null then
        res = host.create_folder(base, sub)
        if res isa string then
            print("Error: " + res)
            return 1
        end if
    end if
    return 0
end function

// MakeDirs() Create a chain of directories.  Takes a string argument.
//
// If any directory in the path is missing, it is created.
//
// Returns 1 on error, 0 if everything's fine.
FileLib.MakeDirs = function(path)
    parts = FileLib.Paths.NormalizePath(FileLib.Paths.SplitPath(path))
    for idx in parts.indexes
        res = FileLib.MkDir(parts[:idx])
        if res != 0 then return res
    end for
    return 0
end function
