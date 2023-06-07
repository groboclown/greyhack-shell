// A .gs Compiler.
// Compiles a script file to an executable.
// Because this is usually bundled with the extract.gs, it should be a
// stand-alone script (no imports).


Help = function(err)
    if err != null then
        print "<color #ff2020>Error: " + err + "</color>"
        print ""
    end if
    print "<color #808080>Compile GreyScript (.gs) files.</color>"
    print "<color #008080>Usage:</color> " + program_path + " [-I include-dir] [-o out-file] [-T] [--help] source-file"
    print ""
    print "<color #808080>   -I include-dir     Specify a /" + "/#require base directory</color>"
    print "<color #808080>   -o out-file        The compiled file.  Defaults to 'out.a'</color>"
    print "<color #808080>   -h, --help         This screen.</color>"
    print "<color #808080>   -T                 Run as a test.  The out-file will be ignored.</color>"
    print "<color #808080>   source-file        The GreyScript file to compile.</color>"
    CleanUp(get_shell.host_computer)
end function


tmpFiles = []

CleanUp = function(scope, message=null)
    while tmpFiles.len > 0
        path = tmpFiles.pop()
        f = scope.File(path)
        if f != null and not f.is_folder then
            res = f.delete
            if res != 1 then
                print "<color #604020>Warning: failed to remove " + f.path + "</color>"
            end if
        end if
    end while
    exit(message)
end function

SetupTempDir = function(scope)
    tmp_dir = scope.File(home + "/.tmp")
    if tmp_dir == null then
        res = scope.create_folder(home, ".tmp")
        if res != 1 then return "Failed to create " + home + "/.tmp"
        tmp_dir = scope.File(home + "/.tmp")
    end if
    if not tmp_dir.is_folder then return "Required to be a directory: " + home + "/.tmp"
    return tmp_dir
end function

NormalizePath = function(path)
    if path.len <= 0 then return "/"
    while path.indexOf("//") >= 0
        path = path.replace("//", "/")
    end while
    while path[-1] == "/"
        path = path[:-1]
    end while
    // Can't type '~' at the terminal, so '-' is a replacement.
    if path[0:1] == "~/" or path[0:1] == "-/" then return home_dir + path[2:]
    if path[0] != "/" then
        // "current_path" is bugged.  It returns the program's path.
        return home_dir + "/" + path
    end if
    return path
end function

CompileFile = function(scope, shell, home, orig, out, content)
    out_dir = parent_path(out)
    out_name = out[out_dir.len + 1:]

    tmp_dir = SetupTempDir(scope)
    if tmp_dir isa string then return tmp_dir

    src_name = tmp_dir.path + "/s.src"
    tmpFiles.push(src_name)
    src = scope.File(src_name)
    if src == null then
        res = scope.touch(tmp_dir.path, "s.src")
        if res != 1 then return "Failed to create " + src_name
        src = scope.File(src_name)
    end if
    if src.is_folder then return "Exists but is a folder: " + src_name
    src.set_content(content)
    print "<color #606060>Compiling [" + orig + "] to [" + tmp_dir.path + "/s]</color>"
    res = shell.build(src_name, tmp_dir.path)
    if res != "" and res != null then return "Failed compiling " + orig + ": " + res
    compiled = scope.File(tmp_dir.path + "/s")
    if compiled == null or compiled.is_folder or not compiled.is_binary then return "Failed building " + src_name
    tmpFiles.push(compiled.path)
    print "<color #404040> - moving " + compiled.path + " to " + out_dir + "/" + out_name + "</color>"
    res = compiled.move(out_dir, out_name)
    if res != 1 then return "Could not rename " + compiled.path + " to " + out_dir + "/" + out_name
    return null
end function

CreateIncludeLine = function(path)
    // the following text is like a weird define.  It can't be all together.
    return "impor" + "t_code(""" + path + """)"
end function

FindIncludeFiles = function(scope, incl, path)
    tmp_dir = SetupTempDir(scope)
    if tmp_dir isa string then CleanUp(scope, tmp_dir)

    PrepFile = function(src)
        if src != null and src isa string then src = scope.File(src)
        if src == null then return null
        if src.path.indexOf("-") < 0 and src.path.indexOf("_") < 0 and src.path.indexOf(" ") < 0 then
            return src
        end if
        // Need to create a temporary version of it.
        name = ""
        for c in src.name
            if c != "-" and c != "_" and c != " " then
                name = name + c
            end if
        end for
        index = 0
        ret_name = name
        ret = scope.File(tmp_dir.path + "/" + ret_name)
        while ret != null
            ret_name = str(index) + name
            index = index + 1
            ret = scope.File(tmp_dir.path + "/" + ret_name)
        end while
        src.copy(tmp_dir.path, ret_name)
        ret = scope.File(tmp_dir.path + "/" + ret_name)
        if ret != null then tmpFiles.push(ret.path)
        return ret
    end function

    match = []
    if path[0] == "/" then
        // print "Matching [" + path + "] in include path"
        match.push(path)
    else
        for inc in incl
            // print "Matching [" + inc + "/" + path + "] in include path"
            match.push(inc + "/" + path)
        end for
    end if
    ret = []
    for p in match
        fl = []
        if p[-2:] == "/*" then
            pf = scope.File(p[:-2])
            if pf != null and pf.is_folder then
                kids = pf.get_files
                for kid in kids
                    // print " ... trying [" + kid.path + "]"
                    fl.push(kid.path)
                end for
            end if
        else
            // print " ... trying [" + p + "]"
            fl.push(p)
        end if
        for n in fl
            f = PrepFile(n)
            // print " ... inspecting " + n
            if f != null and not f.is_folder and not f.is_binary and n[-3:] == ".gs" then
                ret.push(f.path)
            end if
        end for
    end for
    if ret.len <= 0 then CleanUp(scope, "<color #ff0000>Did not find required file " + path + "</color>")
    return ret
end function

LoadSource = function(scope, incl, source)
    LF = char(10)
    CR = char(13)
    TAB = char(9)
    f = scope.File(source)
    if f == null or f.is_folder or f.is_binary then return null
    contents = f.get_content
    ret = ""
    line_start = 0
    pos = 0
    c_end = contents.len
    while pos < c_end
        c = contents[pos]
        if c == LF or c == CR then
            // Pre-processor.
            // print("Parsing [" + contents[line_start:pos] + "]")
            if contents[line_start:line_start+11] == "//#require " then
                bit_start = line_start+11
                bit_end = pos - 1
                while (contents[bit_start] == " " or contents[bit_start] == TAB) and bit_start < bit_end
                    bit_start = bit_start + 1
                end while
                while (contents[bit_end] == " " or contents[bit_end] == TAB) and bit_start < bit_end
                    bit_end = bit_end - 1
                end while
                // print(" -> create include line for [" + contents[bit_start:bit_end + 1] + "]")
                for path in FindIncludeFiles(scope, incl, contents[bit_start:bit_end + 1])
                    // Notes:
                    //   The interpreter only likes alphanumeric, '.' and "/" characters and
                    //   absolute paths.  If this program was *really* good, it would copy
                    //   files that don't have a good path format to a temporary place,
                    //   and replace this with a reference to it.
                    // print " -> adding include for [" + path + "]</color>"
                    ret = ret + CreateIncludeLine(path) + LF
                end for
            else
                // print(" -> adding as line")
                ret = ret + contents[line_start:pos] + LF
            end if
            line_start = pos + 1
        end if
        pos = pos + 1
    end while
    ret = ret + contents[line_start:]
    return ret
end function

// Main Program
include_dirs = []
out_file = current_path + "/out.a"
src_file = null
test = false

state = 0
for param in params
    if state == 0 then
        if param == "-I" then
            state = 1
        else if param == "-o" then
            state = 2
        else if param == "--" then
            state = 3
        else if param == "--help" or param == "-h" then
            Help()
        else if param == "-T" then
            out_file = home_dir + "/.tmp/test.o"
            test = true
        else if param[0] == "-" then
            Help("Unknown argument '" + param + "'.")
        else
            if src_file != null then CleanUp(scope, "<color #ff0000>Too many source files specified.</color>")
            src_file = NormalizePath(param)
        end if
    else if state == 1 then
        include_dirs.push(NormalizePath(param))
        state = 0
    else if state == 2 then
        out_file = NormalizePath(param)
        state = 0
    else if state == 3 then
        // Take the argument, no matter what it's called.
        src_file = NormalizePath(param)
        state = 0
    end if
end for

if include_dirs.len <= 0 then
    include_dirs.push(home_dir + "/src/libs")
end if
if src_file == null then Help("No source file given.")

shell = get_shell
scope = shell.host_computer
home = home_dir

contents = LoadSource(scope, include_dirs, src_file)
if contents == null then CleanUp(scope, "Failed to read contents of " + src_file)
res = CompileFile(scope, shell, home, src_file, out_file, contents)
if res != null then CleanUp(scope, res)
if test then
    print "<color #808080>Launching " + src_file + "</color>"
    CleanUp(scope, shell.launch(out_file))
end if
CleanUp(scope, out_file)
