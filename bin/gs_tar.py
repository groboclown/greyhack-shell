#!/usr/bin/python3

"""
Build up a file that is extractable via the 'extract.gs' script.

Example input:

[
    {
        "type": "folder",
        "name": "/tmp"
    },
    {
        "type": "folder",
        "name": "~/scripts"
    },
    {
        "type": "file",
        "local": "./my-local-file.txt"
        "file": "~/scripts/try.scr"
    },
    {
        "type": "build",
        "source": "~/scripts/try.scr",
        "target": "~/try"
    }
]
"""

from typing import Sequence, List, Dict, Set, Tuple, Optional, Any
import os
import sys
import base64
import json
import re

FILE_VERSION = 1
TEMP_DIR = "~/.tmp"

def debug(msg: str, **args: Any) -> None:
    """Debug message."""
    # sys.stderr.write("[DEBUG] " + (msg.format(**args)) + "\n")
    pass

# -----------------------------------------------
# Low level data converters
def mk_uint8(value: int) -> bytes:
    """Turn an int value into a uint8 value in a byte stream."""
    assert 0 <= value <= 255
    return value.to_bytes(1, 'big')


def mk_uint16(value: int) -> bytes:
    """Turn an int value into a uint16 value in a byte stream."""
    assert 0 <= value <= 65535
    return value.to_bytes(2, 'big')


def mk_bool(value: bool) -> bytes:
    """Turn a boolean into a 1 or 0"""
    return mk_uint8(1 if value else 0)

def mk_ref(index: int) -> bytes:
    """Turn a reference index into a uint16 in a byte stream."""
    return mk_uint16(index)


def mk_chunk(chunk_id: int, chunk_data: bytes) -> bytes:
    """Create a chunk block."""
    # A chunk is the chunk ID + chunk's data size (uint16) + data.
    assert 0 <= chunk_id <= 255
    ret = bytes([chunk_id]) + mk_uint16(len(chunk_data)) + chunk_data

    # r = f"[chunk {chunk_id}]"
    # for b in ret:
    #     r += f" {b:02x}"
    # print(r)

    return ret


# -----------------------------------------------
# Low level block creators

BLOCK_HEADER = 0
BLOCK_ASCII = 1
BLOCK_UTF16 = 2
BLOCK_REL_HOME = 3
BLOCK_FOLDER = 20
BLOCK_FILE = 21
BLOCK_CHMOD = 24
BLOCK_CHOWN = 25
BLOCK_CHGROUP = 26
BLOCK_NEW_USER = 40
BLOCK_NEW_GROUP = 41
BLOCK_BUILD = 80
BLOCK_TEST = 81
BLOCK_LAUNCH = 82
BLOCK_COPY = 83
BLOCK_MOVE = 84
BLOCK_DELETE = 85


def mk_block_header() -> bytes:
    """Create a header block."""
    # version, rest of the header size.
    return mk_chunk(BLOCK_HEADER, mk_uint16(FILE_VERSION) + mk_uint16(0))


def mk_block_string(index: int, text: str) -> bytes:
    """Create a block with a referencable, indexed string."""
    debug("Adding string {i}: '{txt}'", i=index, txt=text)
    try:
        encoded = text.encode('ascii')
        return mk_chunk(BLOCK_ASCII, mk_ref(index) + mk_uint16(len(text)) + encoded)
    except UnicodeEncodeError:
        # Strip off the leading \xff \xfe from the utf-16 string
        encoded = text.encode('utf-16')[2:]
        # Don't allow > 16-bit characters...
        if len(encoded) != len(text) * 2:
            raise RuntimeError(f"Only 2-byte UTF characters are allowed ({text})")
        data = b''
        for i in range(0, len(encoded), 2):
            data += mk_uint16((encoded[i] << 8) + encoded[i + 1])
        return mk_chunk(BLOCK_UTF16, mk_ref(index) + mk_uint16(len(text)) + data)


def mk_block_rel_home(index: int, text: str) -> bytes:
    """Create a block that goes into the string pool, but whose value is a path
    that is relative to the user's home directory."""
    # File paths are always ascii-encoded.
    debug("Adding rel home string {i}: '{txt}'", i=index, txt=text)
    return mk_chunk(BLOCK_REL_HOME, mk_ref(index) + mk_uint16(len(text)) + text.encode('ascii'))


def mk_block_folder(parent_index: int, name_index: int) -> bytes:
    """Create a folder block."""
    return mk_chunk(BLOCK_FOLDER, mk_ref(parent_index) + mk_ref(name_index))


def mk_block_file(dirname_index: int, filename_index: int, contents_index: int) -> bytes:
    """Create a file block."""
    return mk_chunk(
        BLOCK_FILE,
        mk_ref(dirname_index) + mk_ref(filename_index) + mk_ref(contents_index),
    )


def mk_block_chmod(file_name_index: int, perms_index: int, recursive: bool) -> bytes:
    """Create a chmod block."""
    return mk_chunk(
        BLOCK_CHMOD,
        mk_ref(file_name_index) + mk_ref(perms_index) + mk_bool(recursive),
    )


def mk_block_chown(file_name_index: int, username_index: int, recursive: bool) -> bytes:
    """Create a chown block"""
    return mk_chunk(
        BLOCK_CHOWN,
        mk_ref(file_name_index) + mk_ref(username_index) + mk_bool(recursive),
    )


def mk_block_chgroup(file_name_index: int, group_index: str, recursive: bool) -> bytes:
    """Create a chgroup block"""
    return mk_chunk(
        BLOCK_CHOWN,
        mk_ref(file_name_index) + mk_ref(group_index) + mk_bool(recursive),
    )


def mk_block_user(username_index: int, password_index: int) -> bytes:
    """Create a new user block."""
    return mk_chunk(
        BLOCK_NEW_USER,
        mk_ref(username_index) + mk_ref(password_index))


def mk_block_group(username_index: int, group_index: int) -> bytes:
    """Assign a user to a group, block."""
    return mk_chunk(
        BLOCK_NEW_GROUP,
        mk_ref(username_index) + mk_ref(group_index))


def mk_block_build(source_index: int, target_dir_index: int, target_file_name_index: int) -> bytes:
    """Create a build block."""
    debug(
        "build block: src={src}, target dir={td}, target name={tn}",
        src=source_index,
        td=target_dir_index,
        tn=target_file_name_index,
    )
    return mk_chunk(
        BLOCK_BUILD,
        mk_ref(source_index) + mk_ref(target_dir_index) + mk_ref(target_file_name_index),
    )


def mk_block_test(test_index: int, name_index: str, contents_index: str) -> bytes:
    """Create a test block."""
    return mk_chunk(
        BLOCK_TEST,
        mk_uint16(test_index) + mk_ref(name_index) + mk_ref(contents_index),
    )


def mk_block_launch(argument_index: Sequence[int]) -> bytes:
    """Create a launch program block."""
    if len(argument_index) < 1:
        raise RuntimeError(f"Launch program must have at least 1 argument, found {len(argument_index)}")
    data = mk_uint8(len(argument_index))
    for arg in argument_index:
        data += mk_ref(arg)
    return mk_chunk(BLOCK_LAUNCH, data)


def mk_block_copy(source_index: int, target_path_idx: int, target_name: int) -> bytes:
    """Create a copy a file block."""
    return mk_chunk(
        BLOCK_COPY,
        mk_ref(source_index) + mk_ref(target_path_idx) + mk_ref(target_name),
    )


def mk_block_move(source_index: int, target_path_idx: int, target_name: int) -> bytes:
    """Create a move a file block."""
    return mk_chunk(
        BLOCK_MOVE,
        mk_ref(source_index) + mk_ref(target_path_idx) + mk_ref(target_name),
    )


def mk_block_delete(file_index: int) -> bytes:
    """Create a delete a file block."""
    return mk_chunk(BLOCK_DELETE, mk_ref(file_index))


class Blocks:
    """Stores the blocks"""

    def __init__(self) -> None:
        self._strings: Dict[str, int] = {}
        self._rel_paths: Dict[str, int] = {}
        self._string_idx = 0
        self._folders: List[Tuple[str, bytes]] = []
        self._file_blocks: List[bytes] = []
        self._build_blocks: List[bytes] = []
        self._test_blocks: List[bytes] = []
        self._user_blocks: List[bytes] = []
        self._group_blocks: List[bytes] = []
        self._other_blocks: List[bytes] = []
        self.include_dir = "~/src/include"
    
    def assemble(self) -> bytes:
        """Final assembly of the blocks."""
        # The assembled order must be done to make the extract script
        # as trivial in implementation as possible.  So ordering is done here.

        # Start with the header.
        ret = mk_block_header()
        # Then the strings
        for text, idx in self._strings.items():
            ret += mk_block_string(idx, text)
        for text, idx in self._rel_paths.items():
            ret += mk_block_rel_home(idx, text)
        # Then the folders, ordered so that they can be simply
        # created.
        folders = sorted(self._folders, key=lambda a: a[0])
        for _, block in folders:
            ret += block
        
        # Then the files.  Order doesn't matter here.
        for block in self._file_blocks:
            ret += block
        # Then build the files.  Order doesn't matter here.
        for block in self._build_blocks:
            ret += block
        # Then users.  Order doesn't matter.
        for block in self._user_blocks:
            ret += block
        # Then groups assigned to users.  Order doesn't matter.
        for block in self._group_blocks:
            ret += block
        # Then the other stuff.  This requires everything else to already exist.
        for block in self._other_blocks:
            ret += block
        # Finally, test it.
        for block in self._test_blocks:
            ret += block
        return ret

    def _add_string(self, text: str) -> int:
        if text in self._strings:
            ret = self._strings[text]
        else:
            ret = self._string_idx
            self._string_idx += 1
            self._strings[text] = ret
        return ret
    
    def _add_path(self, text: str) -> int:
        group = self._strings
        if text == "~":
            group = self._rel_paths
            text = ""
        elif text[0:2] == "~/":
            group = self._rel_paths
            text = text[2:]
        elif text != "/" and text:
            while text[-1] == "/":
                text = text[:-1]
        if text in group:
            idx = group[text]
        else:
            idx = self._string_idx
            self._string_idx += 1
            group[text] = idx
        return idx

    def add_folder(self, folder_name: str) -> None:
        """Create a folder block."""
        # print(f"ADD FOLDER [{folder_name}]")
        if folder_name == "/" or folder_name == "~":
            # The root was reached during recursive adds.
            return

        parent, name = Blocks._split(folder_name)
        if name == "":
            # this reached the root during recursive required adds.
            # If parent isn't empty, then there was a relative
            # directory request, which is not recommended.
            # If the parent is empty, then it's gone up the
            # whole tree.
            # Ignore it.
            return
        
        # Check that the joint path hasn't already been added.
        normalized = parent + "/" + name
        for exist, _ in self._folders:
            if exist == normalized:
                # already added
                return

        # Ensure the parent is added, to make the bundle assembly
        # definition simpler.
        self.add_folder(parent)

        # If the parent is empty, then a folder is being added to the
        # root directory.
        parent_idx = self._add_path(parent)
        name_idx = self._add_string(name)
        self._folders.append(
            (normalized, mk_block_folder(parent_idx, name_idx))
        )

    def add_file(self, file_name: str, contents: str) -> None:
        """Create a file block."""
        parent, name = Blocks._split(file_name)
        assert name
        # Ensure the parent directory is created.
        # This makes bundle definition easier.
        self.add_folder(parent)

        dirname_idx = self._add_path(parent)
        fname_idx = self._add_string(name)
        contents_idx = self._add_string(contents)
        self._file_blocks.append(mk_block_file(dirname_idx, fname_idx, contents_idx))

    def add_user(self, username: str, password: str) -> None:
        """Create a new user block."""
        username_idx = self._add_string(username)
        password_idx = self._add_string(password)
        self._user_blocks.append(mk_block_user(username_idx, password_idx))

    def add_group(self, username: str, group: str) -> None:
        """Create a new group, or assign a user to a group, block."""
        username_idx = self._add_string(username)
        group_idx = self._add_string(group)
        self._group_blocks.append(mk_block_group(username_idx, group_idx))

    def add_chmod(self, file_name: str, perms: str, recursive: bool) -> None:
        """Create a chmod block."""
        file_name_idx = self._add_path(Blocks._normalize(file_name))
        perms_idx = self._add_string(perms)
        self._other_blocks.append(mk_block_chmod(file_name_idx, perms_idx, recursive))

    def add_chown(self, file_name: str, username: str, recursive: bool) -> None:
        """Create a chown block"""
        file_name_idx = self._add_path(Blocks._normalize(file_name))
        username_idx = self._add_string(username)
        self._other_blocks.append(mk_block_chown(file_name_idx, username_idx, recursive))

    def add_chgroup(self, file_name: str, group: str, recursive: bool) -> None:
        """Create a chgroup block"""
        file_name_idx = self._add_path(Blocks._normalize(file_name))
        group_idx = self._add_string(group)
        self._other_blocks.append(mk_block_chgroup(file_name_idx, group_idx, recursive))

    def add_build(self, source: str, target: str) -> None:
        """Create a build block."""
        source_idx = self._add_path(Blocks._normalize(source))
        target_p, target_n = Blocks._split(target)
        # Ensure the target parent directory exists
        self.add_folder(target_p)
        dirname_idx = self._add_path(target_p)
        fname_idx = self._add_string(target_n)
        self._build_blocks.append(mk_block_build(source_idx, dirname_idx, fname_idx))

    def add_test(self, name: str, contents: str) -> None:
        """Create a test block."""
        # Ensure the test directory exists first.
        self.add_folder(TEMP_DIR + "/tests")
        test_idx = len(self._test_blocks)
        name_idx = self._add_string(name)
        contents_idx = self._add_string(contents)
        self._test_blocks.append(mk_block_test(test_idx, name_idx, contents_idx))
    
    def add_launch(self, args: Sequence[str]) -> None:
        """Create a launch block."""
        # Added to the 'build' set of instructions.
        # Arguments are considered paths, but don't force them to be normalized.
        arg_idx: List[int] = [self._add_path(a) for a in args]
        self._build_blocks.append(mk_block_launch(arg_idx))
    
    def add_copy(self, source: str, target: str) -> None:
        """Create a copy file block."""
        # Added to the 'build' set of instructions.
        source_idx = self._add_path(Blocks._normalize(source))
        target_p, target_n = Blocks._split(target)
        # Ensure the target parent directory exists
        self.add_folder(target_p)
        dirname_idx = self._add_path(target_p)
        fname_idx = self._add_string(target_n)
        self._build_blocks.append(mk_block_copy(source_idx, dirname_idx, fname_idx))
    
    def add_move(self, source: str, target: str) -> None:
        """Create a move file block."""
        # Added to the 'build' set of instructions.
        source_idx = self._add_path(Blocks._normalize(source))
        target_p, target_n = Blocks._split(target)
        # Ensure the target parent directory exists
        self.add_folder(target_p)
        dirname_idx = self._add_path(target_p)
        fname_idx = self._add_string(target_n)
        self._build_blocks.append(mk_block_move(source_idx, dirname_idx, fname_idx))
    
    def add_delete(self, path: str) -> None:
        """Create delete a file or folder block."""
        # Added to the 'build' set of instructions.
        path_idx = self._add_path(Blocks._normalize(path))
        self._build_blocks.append(mk_block_delete(path_idx))

    @staticmethod
    def _split(name: str) -> Tuple[str, str]:
        name = Blocks._normalize(name)
        if '/' not in name:
            return name, ""
        pos = name.rindex('/')
        parent = name[:pos]
        fname = name[pos+1:]
        return parent, fname
    
    @staticmethod
    def _normalize(name: str) -> str:
        name = name.replace("\\", "/")
        while "//" in name:
            name = name.replace("//", "/")
        return name


IMPORT_RE = re.compile(r'^\s*import_code\s*\(\s*"\${?INC}?/([^"]+)"\s*\)\s*$')


def get_content_with_includes(contents: str, include_dir: str) -> str:
    """Special content parsing to allow pulling files from the include dir.
    
    This auto-replaces paths that start with a '${INC}/' or '$INC/' with the
    include directory.  The include directory can start with the home directory
    reference ("~/")
    """
    while include_dir and include_dir[-1] == "/":
        include_dir = include_dir[:-1]
    if include_dir:
        if include_dir.startswith("~/"):
            # This causes a compile error in the generated code.
            include_dir_src = f'home_dir + "{include_dir[1:]}/'
        else:
            include_dir_src = f'"{include_dir}'
    else:
        include_dir_src = '"/'
    ret = ""
    for line in contents.splitlines():
        # Strip each line, to help minimize it.
        line = line.strip()
        # Do not skip blank lines.  It's really useful to keep line numbers the same.
        mtc = IMPORT_RE.match(line)
        if mtc:
            # Matched up a include-dir path.
            line = f'import_code({include_dir_src}{mtc.group(1)}")'
        if line.startswith("//"):
            # Strip out comments that are easy to spot.
            line = ""
        ret += "\n" + line
    return ret


def parse_block_cmd(
        blocks: Blocks,
        value: Dict[str, Any],
        context_dir: str,
) -> None:
    """Create a block command from a json entry.
    
    Folders are left for later.  They must be added at the start of the block list,
    and be ordered correctly.
    """
    cmd = value.get('type')
    if cmd == 'folder':
        blocks.add_folder(str(value['name']))
    elif cmd == 'file':
        file_name = str(value['file'])
        contents = value.get('contents')
        if not contents:
            src_file = os.path.join(context_dir, value['local'])
            with open(src_file, 'r', encoding='utf-8') as fis:
                contents = fis.read()
        if value.get('is-source') == True:
            contents = get_content_with_includes(contents, blocks.include_dir)
        blocks.add_file(
            file_name,
            contents,
        )
    elif cmd == 'user':
        blocks.add_user(str(value['user']), str(value['password']))
    elif cmd == 'group':
        blocks.add_group(str(value['user']), str(value['group']))
    elif cmd == 'chmod':
        blocks.add_chmod(str(value['file']), str(value['permissions']))
    elif cmd == 'chown':
        file_name = str(value['file'])
        recursive = bool(value.get('recursive', False))
        owner = value.get('owner')
        if isinstance(owner, str):
            if ':' in owner:
                blocks.add_chown(file_name, owner[owner.index(':')].strip(), recursive)
                blocks.add_chgroup(file_name, owner[owner.index(':')+1].strip(), recursive)
            else:
                blocks.add_chown(file_name, owner, recursive)
        else:
            blocks.add_chown(file_name, str(value['user']), recursive)
    elif cmd == 'chgroup':
        file_name = str(value['file'])
        recursive = bool(value.get('recursive', False))
        blocks.add_chgroup(file_name, str(value['group']), recursive)
    elif cmd == 'build':
        blocks.add_build(str(value['source']), str(value['target']))
    elif cmd == 'source':
        # A combined operation.
        source_name = str(value['file'])
        contents = value.get('contents')
        if not contents:
            src_file = os.path.join(context_dir, value['local'])
            with open(src_file, 'r', encoding='utf-8') as fis:
                contents = fis.read()
        # It is always source.
        contents = get_content_with_includes(contents, blocks.include_dir)
        blocks.add_file(
            source_name,
            contents,
        )
        blocks.add_build(source_name, str(value['target']))
    elif cmd == 'test':
        contents = value.get('contents')
        if not contents:
            src_file = os.path.join(context_dir, value['local'])
            with open(src_file, 'r', encoding='utf-8') as fis:
                contents = fis.read()
        contents = get_content_with_includes(contents, blocks.include_dir)
        blocks.add_test(str(value['name']), contents)
    elif cmd in ('launch', 'exec', 'run'):
        args = [value['cmd'], *value.get('arguments', ())]
        blocks.add_launch(args)
    elif cmd in ('copy', 'cp'):
        blocks.add_copy(value['from'], value['to'])
    elif cmd == ('move', 'mv', 'rename', 'ren'):
        blocks.add_move(value['from'], value['to'])
    elif cmd == ('delete', 'del', 'rm'):
        blocks.add_delete(value['path'])
    elif cmd == 'about':
        # Ignore most of what's in this.
        include = value.get('include-dir')
        if isinstance(include, str) and include:
            blocks.include_dir = include
    else:
        raise ValueError(f'unknown block type {cmd}')


def create_folder_blocks(folders: Set[Sequence[str]]) -> bytes:
    """Create the blocks for creating the folders, in order."""
    all_folders: List[str] = []
    for parts in folders:
        name = '/'.join(parts)
        if name[0] != '/' and name[0] != '~':
            name = '/' + name
        all_folders.append(name)
    all_folders.sort()
    ret = b''
    for name in all_folders:
        if name not in ('/', ''):
            ret += mk_block_folder(name)
    return ret


def parse_json(data: Any, context_dir: str) -> bytes:
    """Parse the json data into the block store."""
    if not isinstance(data, (list, tuple)):
        raise ValueError('Data must be an array of blocks.')
    blocks = Blocks()

    # Must always exist
    blocks.add_folder(TEMP_DIR)

    for block in data:
        parse_block_cmd(blocks, block, context_dir)
    
    return blocks.assemble()


def convert(data: bytes, wide: bool) -> str:
    """Convert the data into the encoded form."""
    res = base64.b64encode(data).decode('ascii')
    ret = ''
    while res:
        ret += res[:70]
        if not wide:
            ret += '\n'
        res = res[70:]
    return ret


def main(args: Sequence[str]) -> int:
    if len(args) <= 1 or "-h" in args or "--help" in args:
        print(f"Usage: {args[0]} [-w] (bundle filename)")
        return 0
    wide = False
    filename = args[1]
    if filename == "-w":
        if len(args) <= 2:
            print("Use '-w' for wide printing.")
            return 1
        wide = True
        filename = args[2]
    with open(filename, 'r', encoding='utf-8') as fis:
        data = json.load(fis)
    blocks = parse_json(data, os.path.dirname(filename))
    print(convert(blocks, wide))


if __name__ == '__main__':
    sys.exit(main(sys.argv))
