// Library for handling paths on a computer.

if not globals.hasIndex("FileLib") then globals.FileLib = {}

    
FileLib.Paths = {
    "Home": home_dir,
    "Host": get_shell.host_computer,
    "Cwd": current_path,
    "CurDir": ".",
    "ParDir": "..",
    "Sep": "/",
    "Seps": ["/", "\"],
    // The terminal does not allow "~", so "-" is used as an alternative.
    "HomeShort": ["-", "~"],
}

// SplitPath() Splits a string into a list of path parts.
//
// If the path is already absolute, the returned path will have "/" as the
// first path element.  Multiple "/" in a row are concatenated into one "/".
FileLib.Paths.SplitPath = function(path)
    ret = []
    buff = ""
    for idx in path.indexes
        c = path[idx]
        // Does c match one of the separators?
        if FileLib.Paths.Seps.indexOf(c) != null then
            if ret.len == 0 then
                ret.push(FileLib.Paths.Sep)
            else if buff.len > 0 then
                ret.push(buff)
            end if
            buff = ""
        else
            buff = buff + c
        end if
    end for
    if buff.len > 0 then
        ret.push(buff)
    end if
    return ret
end function

// NormalizePath() Normalizes the path parts into an absolute series of folder names.
//
// Argument is a list of directory names.  Special support for the first
// path part being a path separator or the home reference.
FileLib.Paths.NormalizePath = function(parts)
    ret = []
    // Does the first path part match a short version of the home strings?
    if FileLib.Paths.HomeShort.indexOf(parts[0]) != null then
        ret = FileLib.Paths.SplitPath(Paths.Home)
        parts = parts[1:]
    else if FileLib.Paths.Seps.indexOf(parts[0]) != null then
        // keep it absolute.
        parts = parts[1:]
    else
        // relative to current directory
        ret = FileLib.Paths.SplitPath(Paths.Cwd)
        if ret[0] == "/" then
            ret = ret[1:]
        end if
    end if
    for part in parts
        if part == FileLib.Paths.CurDir then
            // skip it
            continue
        else if part == FileLib.Paths.ParDir then
            // go up one
            if ret.len > 0 then ret.pop()
        else
            ret.push(part)
        end if
    end for
end function

// JoinPath() Joins the absolute path of items in the part list together.
FileLib.Paths.JoinPath = function(parts)
    ret = ""
    for part in parts.indexes
        ret = ret + FileLib.Paths.Sep + part
    end for
    if ret == "" then return FileLib.Paths.Sep
    return ret
end function
