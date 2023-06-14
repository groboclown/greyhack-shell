// Library for handling paths on a computer.

if not globals.hasIndex("FileLib") then globals.FileLib = {}
FileLib = globals.FileLib

    
FileLib.Paths = {
    "Home": home_dir,
    "Cwd": current_path, // see bug: https://greytracker.org/bugzilla/show_bug.cgi?id=630
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
    start = 0
    pos = 0
    tail = path.len
    while pos < tail
        c = path[pos]
        // Does c match one of the separators?
        if self.Seps.indexOf(c) != null then
            if pos == 0 then
                // The very first character is a separator, so
                // mark that to indicate an absolute path.
                ret.push(self.Sep)
            else if pos > start then
                ret.push(path[start:pos])
            end if
            start = pos + 1
        end if
        pos = pos + 1
    end while
    if start < tail then
        ret.push(path[start:])
    end if
    return ret
end function

// NormalizePath() Normalizes the path parts into an absolute series of folder names.
//
// Argument is a list of directory names.  Special support for the first
// path part being a path separator or the home reference.
FileLib.Paths.NormalizePath = function(parts, home=null, cwd=null)
    ret = []
    if parts.len <= 0 then return ret
    // Does the first path part match a short version of the home strings?
    if self.HomeShort.indexOf(parts[0]) != null then
        if home == null then home = self.Home
        ret = self.SplitPath(home)
        if ret[0] == "/" then
            ret = ret[1:]
        end if
        parts = parts[1:]
    else if self.Seps.indexOf(parts[0]) != null then
        // keep it absolute.
        parts = parts[1:]
    else
        // relative to current directory
        if cwd == null then cwd = self.Cwd
        ret = self.SplitPath(cwd)
        if ret[0] == "/" then
            ret = ret[1:]
        end if
    end if
    for part in parts
        if part == self.CurDir then
            // skip it
            continue
        else if part == self.ParDir then
            // go up one
            if ret.len > 0 then ret.pop()
        else
            ret.push(part)
        end if
    end for
    return ret
end function

// JoinPath() Joins the absolute path of items in the part list together.
FileLib.Paths.JoinPath = function(parts)
    ret = ""
    for part in parts
        ret = ret + self.Sep + part
    end for
    if ret == "" then return self.Sep
    return ret
end function

// NormalizeFilename() turn a single string into a normalized filename.
FileLib.Paths.NormalizeFilename = function(filename, home=null, cwd=null)
    return FileLib.Paths.JoinPath(FileLib.Paths.NormalizePath(FileLib.Paths.SplitPath(filename), home, cwd))
end function
