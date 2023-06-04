// Grey Hack script to unpack an exported file and compile it in the game.
// Version 1.0.1

if params.len > 0 and (params[0] == "-h" or params[0] == "--help") then
    exit("Usage: extract (packed source file)")
end if


// ==========================================================================
// For easy mock testing
GetFile = function(name)
    return get_shell.host_computer.File(name)
end function
TouchFile = function(parent, name)
    return get_shell.host_computer.touch(parent, name)
end function
CreateFolder = function(parent, name)
    return get_shell.host_computer.create_folder(parent, name)
end function
CreateUser = function(username, password)
    return get_shell.host_computer.create_user(username, password)
end function
CreateGroup = function(username, group)
    return get_shell.host_computer.create_group(username, group)
end function
Compile = function(source_file, outdir)
    return get_shell.build(source_file, outdir)
end function
LaunchProgram = function(program)
    return get_shell.launch(program)
end function


DEBUG = function(msg)
    // print("<color=#707070> [DEBUG] " + msg + "</color>")
end function
INFO = function(msg)
    print("<color=#a0a0a0>" + msg + "</color>")
end function
TEMP_DIR = home_dir + "/" + ".tmp"

// ==========================================================================
// CompTarFile handler for reading data
CompTarFile = {}

// CompTarFile.NewFile() create a new CompTarFile instance from a file.
CompTarFile.NewFile = function(name)
    source_file = GetFile(name)
    if source_file == null or source_file.is_folder then return null
    ret = new CompTarFile
    ret.init(source_file.path, source_file.get_content)
    return ret
end function

// CompTarFile.NewString() create a new CompTarFile from a string.
CompTarFile.NewString = function(text)
    if text == null or text.len <= 0 then return null
    ret = new CompTarFile
    ret.init("input", text)
    return ret
end function

CompTarFile.init = function(path, contents)
    self.path = path
    self.content = contents
    self.read_pos = 0
    self.last_data = 0
    self.remaining_bits = 0
    self.Source = path
    self.base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    self.strings = {}
end function

// CompTarFile.HasMore() is there more data to read?
CompTarFile.HasMore = function()
    // Is this a valid read position?
    while self.read_pos < self.content.len
        // Is this a non-ignored character?
        if not self.is_ignored(self.content[self.read_pos]) then return true
        // It's ignored.  Advance and see if the next one is ignored.
        self.read_pos = self.read_pos + 1
    end while
    return false
end function

CompTarFile.is_ignored = function(c)
    // Ignore whitespace
    ic = c.code
    return c == " " or ic == 10 or ic == 13 or ic == 9
end function

// CompTarFile.read6() reads the next data as an unsigned 6 bit integer (0-63).
CompTarFile.read6 = function()
    // advance to a non-ignored value
    if not self.HasMore() then exit("Read past end")
    val = self.content[self.read_pos]
    if val == "=" then val = "A"
    ret = self.base64.indexOf(val)
    if ret < 0 or ret >= 64 then exit("Bad encoding at position " + self.read_pos)
    self.read_pos = self.read_pos + 1
    return ret
end function

// CompTarFile.read24()  reads the next data as an unsigned 24 bit integer (0-16777215)
CompTarFile.read24 = function()
    val1 = self.read6
    val2 = self.read6
    val3 = self.read6
    val4 = self.read6
    ret = (val1 * 262144) + (val2 * 4096) + (val3 * 64) + val4
    return ret
end function

// CompTarFile.UInt8() reads the next data as an unsigned 8 bit integer (0-255).
CompTarFile.UInt8 = function()
    if self.remaining_bits == 0 then
        x = self.read24
        // y = bitwise("&", bitwise(">>", x, 16), 255)
        y = floor(x / 65536) % 256
        self.remaining_bits = 16
        // self.last_data = bitwise("&", x, 65535)
        self.last_data = x % 65536
        return y
    end if
    if self.remaining_bits == 8 then
        self.remaining_bits = 0
        // y = bitwise("&", self.last_data, 255)
        y = self.last_data % 256
        return y
    end if
    if self.remaining_bits == 16 then
        // x = bitwise("&", bitwise(">>", self.last_data, 8), 255)
        x = floor(self.last_data / 256) % 256
        // self.last_data = bitwise("&", self.last_data, 255)
        self.last_data = self.last_data % 256
        self.remaining_bits = 8
        return x
    end if
    exit("Unexpected bit count remaining: " + self.remaining_bits)
end function

// CompTarFile.UInt16() reads the next data as an unsigned 16 bit integer (0-65535).
CompTarFile.UInt16 = function()
    if self.remaining_bits == 16 then
        // optimization
        self.remaining_bits = 0
        // y = bitwise("&", self.last_data, 65535)
        y = self.last_data % 65536
        return y
    end if
    y = (self.UInt8 * 256) + self.UInt8
    return y
end function

// CompTarFile.Ascii() reads an ascii-encoded string value, with a 16-bit character length prefix format.
CompTarFile.Ascii = function()
    size = self.UInt16
    ret = ""
    if size > 0 then
        for i in range(0, size - 1)
            ret = ret + char(self.UInt8)
        end for
    end if
    return ret
end function

// CompTarFile.Utf16() reads a simplified utf-16 encoded string value, with a 16-bit character length prefix format.
// The utf-16 characters are restricted to being exactly 2 bytes each.
CompTarFile.Utf16 = function()
    size = self.UInt16
    ret = ""
    if size > 0 then
        for i in range(0, size - 1)
            ret = ret + char(self.UInt16)
        end for
    end if
    return ret
end function
    
// CompTarFile.String() Looks up the next item as a string reference by index.
CompTarFile.String = function()
    idx = self.UInt16
    if self.strings.hasIndex(idx) then
        return self.strings[idx]
    end if
    exit("Invalid file: bad string index " + idx)
end function

// CompTarFile.Skip() Skip a number of bytes in the stream.
CompTarFile.Skip = function(bytes)
    if bytes > 0 then
        for _ in range(0, bytes - 1)
            self.UInt8
        end for
    end if
end function


// ==========================================================================
// The file format is essentially a compressed tar file + build instructions.

file_version = 1
MAX_SUPPORTED_FILE_VERSION = 1
test_dir = TEMP_DIR + "/tests"

// File header
blockHeaderFunc = function(tar)
    globals.file_version = tar.UInt16
    if globals.file_version > MAX_SUPPORTED_FILE_VERSION then
        exit("Unsupported file format: " + globals.file_version)
    end if
    // The rest of the header is the following number of bytes.
    // Added for future support.
    header_size = tar.UInt16
    DEBUG("Header version " + file_version + "; skipping " + header_size + " bytes")
    tar.Skip(header_size)
end function

// ASCII encoded string.
blockAsciiFunc = function(tar)
    str_idx = tar.UInt16
    text = tar.Ascii
    tar.strings[str_idx] = text
end function

// UTF-16 encoded string.
blockUtf16Func = function(tar)
    str_idx = tar.UInt16
    text = tar.Utf16
    tar.strings[str_idx] = text
end function

// Relative-to-home path.
// Paths are always ascii-encoded.
blockRelHomeFunc = function(tar)
    str_idx = tar.UInt16
    text = tar.Ascii
    if text.len > 0 then
        text = home_dir + "/" + text
    else
        text = home_dir
    end if
    tar.strings[str_idx] = text
end function

// Folder
blockFolderFunc = function(tar)
    parent = tar.String
    name = tar.String
    DEBUG("Creating [" + name + "] in folder [" + parent + "]")
    out = GetFile(parent + "/" + name)
    if out == null then
        res = CreateFolder(parent, name)
        if res != 1 then exit("Failed to create folder [" + parent + "/" + name + "]")
        INFO("- created folder [" + parent + "/" + name + "]")
    else
        INFO("- created folder [" + parent + "/" + name + "] (skipped - already exists)")
    end if
end function

// File
blockFileFunc = function(tar)
    base_dir = tar.String
    name = tar.String
    contents = tar.String

    out = GetFile(base_dir + "/" + name)
    if out == null then
        res = TouchFile(base_dir, name)
        if res != 1 then exit(res)
        out = GetFile(base_dir + "/" + name)
        if out == null then exit("Failed to create file " + base_dir + "/" + name)
    end if
    out.set_content(contents)
    INFO("- created file [" + base_dir + "/" + name + "] with " + contents.len + " characters")
end function

// chmod
blockChmodFunc = function(tar)
    fqn = tar.String
    perms = tar.String
    recurse = tar.UInt8

    out = GetFile(fqn)
    if out == null then exit("Could not find file " + fqn)
    res = out.chmod(perms, recurse)
    INFO("- chmod [" + perms + "] [" + out + "]")
end function

// chown user
blockChownFunc = function(tar)
    fqn = tar.String
    username = tar.String
    recurse = tar.UInt8

    out = GetFile(fqn)
    if out == null then exit("Could not find file " + fqn)
    out.set_owner(username, recurse)
    INFO("- chown [" + username + "] [" + out + "]")
end function

// chown group
blockChownGroupFunc = function(tar)
    fqn = tar.String
    group = tar.String
    recurse = tar.UInt8

    out = GetFile(fqn)
    if out == null then exit("Could not find file " + fqn)
    out.set_group(group, recurse)
    INFO("- chgroup [" + group + "] [" + out + "]")
end function

// New User
blockNewUserFunc = function(tar)
    username = tar.String
    password = tar.String

    res = CreateUser(username, password)
    if res != 1 then exit(res)
    INFO("- created user [" + username + "]")
end function

// Assign group to user
blockAssignGroupFunc = function(tar)
    username = tar.String
    group = tar.String

    res = CreateGroup(username, group)
    if res != 1 then exit(res)
    INFO("- created group [" + group + "] for [" + username + "]")
end function

// build
// Build process: compile into the temporary directory, then
// move into the expected location.  The expected location directory must
// exist first.  The file is copied to the temporary directory so that
// we know the name of the compiled-to file.
blockBuildFunc = function(tar)
    source_fqn = tar.String
    DEBUG("build source: " + source_fqn + ";")
    target_path_fqn = tar.String
    DEBUG("build target dir: " + target_path_fqn + ";")
    target_name = tar.String
    DEBUG("build target name: " + target_name + ";")

    src_out = GetFile(source_fqn)
    if src_out == null then exit("No file " + source_fqn + " to build.")
    src_out.copy(TEMP_DIR, "source.src")
    res = Compile(TEMP_DIR + "/source.src", TEMP_DIR)
    if res != "" and res != null then exit("Failed building " + source_fqn + ": " + res)
    out = GetFile(TEMP_DIR + "/source")
    if out == null then exit("Did not build " + source_fqn)
    res = out.move(target_path_fqn, target_name)
    if res != 1 then exit("Could not move file to " + target_path_fqn + "/" + target_name + ": " + res)
    INFO("- compiled [" + src_out.path + "] to [" + target_path_fqn + "/" + target_name + "]")
end function

// test
// Test process: put the source in a temporary directory, compile it,
// then run it.
blockTestFunc = function(tar)
    test_index = tar.UInt16
    name = tar.String
    contents = tar.String

    test_name = test_index + ".src"
    test_fqn = globals.test_dir + "/" + test_name
    test_exec = globals.test_dir + "/" + test_index
    out = GetFile(test_fqn)
    if out == null then
        res = TouchFile(globals.test_dir, test_name)
        if res != 1 then exit(res)
        out = GetFile(test_fqn)
        if out == null then exit("Failed to create file " + test_fqn)
    end if
    out.set_content(contents)
    res = Compile(test_fqn, globals.test_dir)
    if res != "" and res != null then exit("Failed building " + name + ": " + res)
    out = GetFile(test_exec)
    if out == null then exit("Did not build " + source_fqn)
    res = LaunchProgram(test_exec)
    if res != 1 then exit("Test " + name + " failed")
end function

BLOCK_HANDLERS = {
    // BLOCK_HEADER = 0
    0: @blockHeaderFunc,

    // BLOCK_ASCII = 1
    1: @blockAsciiFunc,

    // BLOCK_UTF16 = 2
    2: @blockUtf16Func,

    // BLOCK_REL_HOME = 3
    3: @blockRelHomeFunc,

    // BLOCK_FOLDER = 20
    20: @blockFolderFunc,

    // BLOCK_FILE = 21
    21: @blockFileFunc,

    // BLOCK_CHMOD = 24
    24: @blockChmodFunc,

    // BLOCK_CHOWN = 25
    25: @blockChownFunc,
    
    // BLOCK_CHGROUP = 26
    26: @blockChownGroupFunc,

    // BLOCK_NEW_USER = 40
    40: @blockNewUserFunc,

    // BLOCK_NEW_GROUP = 41
    41: @blockAssignGroupFunc,

    // BLOCK_BUILD = 80
    80: @blockBuildFunc,

    // BLOCK_TEST = 81
    81: @blockTestFunc,
}


// ==========================================================================


if params.len <= 0 then
    source_file = CompTarFile.NewString(user_input("GS Tar String: "))
    if source_file == null then
        exit("Invalid tar string.")
    end if
else
    source_file = CompTarFile.NewFile(params[0])
    if source_file == null then
        exit("Could not find file " + params[0])
    end if
end if
INFO("Uncompressing " + source_file.path)

while source_file.HasMore
    // Get the kind of block
    block_type = source_file.UInt8
    block_size = source_file.UInt16
    if BLOCK_HANDLERS.hasIndex(block_type) then
        BLOCK_HANDLERS[block_type](source_file)
    else
        INFO("Unknown block type " + block_type)
        // Do not fail; this could mean a file format that isn't supported fully.
        // Read in this block's bytes.
        source_file.Skip(block_size)
    end if
end while
