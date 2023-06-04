// Library for handling paths on a computer.

Paths = {}

// Paths.New() Creates a new Paths object.
Paths.New = function()
    ret = new Paths
    ret.Home = home_dir
    ret.Host = get_shell.host_computer
    ret.Cwd = current_path
    ret.CurDir = "."
    ret.ParDir = ".."
    ret.Sep = "/"
    ret.Seps = ["/", "\"]
    // The terminal does not allow "~", so "-" is used as an alternative.
    ret.HomeShort = ["-", "~", "$HOME", "${HOME}"]
    return ret
end function


// SplitPath() Splits a string into a list of path parts.
//
// If the path is already absolute, the returned path will have "/" as the
// first path element.  Multiple "/" in a row are concatenated into one "/".
Paths.SplitPath = function(path)
    ret = []
    buff = ""
    for idx in path.indexes
        c = path[idx]
        // Does c match one of the separators?
        if ret.Seps.indexOf(c) != null then
            if ret.len == 0 then
                ret.push(self.Sep)
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
Paths.NormalizePath = function(parts)
    ret = []
    // Does the first path part match a short version of the home strings?
    if self.HomeShort.indexOf(parts[0]) != null then
        ret = self.SplitPath(self.Home)
        parts = parts[1:]
    else if self.Seps.indexOf(parts[0]) != null then
        // keep it absolute.
        parts = parts[1:]
    else
        // relative to current directory
        ret = self.SplitPath(self.cwd)
        if ret[0] == "/" then
            ret = ret[1:]
        end if
    end if
    for idx in parts.indexes
        part = parts[idx]
        if part == self.CurDir then
            // skip it
            continue
        else if part == self.ParDir then
            // go up one
            if ret.len > 0 then ret.pop()
        else
            ret.push(part)
        end if
    end if
end function

// JoinPath() Joins the absolute path of items in the part list together.
Paths.JoinPath = function(parts)
    ret = ""
    for idx in parts.indexes
        ret = ret + self.Sep + parts[idx]
    end for
    if ret == "" then return self.Sep
    return ret
end function

// MkDir() Create a single directory.  Takes a string argument or a path list.
//
// Returns [error] list; if there is an error, then the first item in the
// list is an error message.
Paths.MkDir = function(path)
    if path isa string then
        parts = self.NormalizePath(self.SplitPath(path))
    else if path isa list then
        parts = self.NormalizePath(path)
    else
        print("Error: invalid argument")
        return 1
    end if
    if parts.len <= 0 then return 0
    base = self.JoinPath(parts[:-1])
    sub = parts[-1]
    fullname = self.JoinPath(parts)
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
Paths.MakeDirs = function(path)
    parts = self.NormalizePath(self.SplitPath(path))
    for idx in parts.indexes
        res = self.MkDir(parts[:idx])
        if res != 0 then return res
    end for
    return 0
end function
