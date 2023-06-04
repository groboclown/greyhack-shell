#!/usr/bin/python3

"""Inspector for the tar bundle.  Used to help debug the extractor."""

from typing import Sequence
import sys
import base64


def main(args: Sequence[str]) -> int:
    if len(args) <= 1 or "-h" in args or "--help" in args:
        print(f"Usage: {args[0]} (file containing gstar contents)")
        return 0
    with open(args[1], "r", encoding="utf-8") as fis:
        contents = fis.read()
    raw = base64.b64decode(contents)
    pos = 0
    while pos < len(raw):
        block_type = raw[pos]
        block_size = raw[pos + 1] * 256 + raw[pos + 2]
        if block_type == 1:  # ascii
            index = raw[pos + 3] * 256 + raw[pos + 4]
            chars = raw[pos + 5] * 256 + raw[pos + 6]
            print(f"ASCII Block: index {index}; {chars} characters")
        elif block_type == 2:  # utf-16
            index = raw[pos + 3] * 256 + raw[pos + 4]
            chars = raw[pos + 5] * 256 + raw[pos + 6]
            print(f"UTF-16 Block: index {index}; {chars} characters")
        elif block_type == 3:  # rel-home
            index = raw[pos + 3] * 256 + raw[pos + 4]
            chars = raw[pos + 5] * 256 + raw[pos + 6]
            print(f"Relative Home String Block: index {index}; {chars} characters")
            print(f"   '{raw[pos+7:pos+3+block_size].decode('ascii')}'")
        elif block_type == 80:  # build
            src_idx = raw[pos + 3] * 256 + raw[pos + 4]
            tgt_d_idx = raw[pos + 5] * 256 + raw[pos + 6]
            tgt_n_idx = raw[pos + 7] * 256 + raw[pos + 8]
            print(f"Build block: source {src_idx}, target dir {tgt_d_idx}, target name {tgt_n_idx}")
        else:
            print(f"Block {block_type}, {block_size} bytes")
        pos += 1 + 2 + block_size
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
