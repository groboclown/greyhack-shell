// From https://svn.apache.org/viewvc/ant/core/trunk/src/main/org/apache/tools/bzip2/CBZip2InputStream.java
// Licensed to the Apache Software Foundation (ASF) under one or more
// contributor license agreements.  See the NOTICE file distributed with
// this work for additional information regarding copyright ownership.
// The ASF licenses this file to You under the Apache License, Version 2.0
// (the "License"); you may not use this file except in compliance with
// the License.  You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

FileLib.BZip2Reader = {}

// FileLib.BZip2Reader.New() Creates a bzip decoder based on a parent binary reader.
FileLib.BZip2Reader.New = function(parent)
    if not parent.HasMore then
        print("Error: Empty Reader")
        return null
    end if

    ret = FileLib.BinaryReader.New("placeholder")
    ret.buffer_bit_size = 8
	ret.load_buffer = @FileLib.BZip2Reader.decode_bytes
    ret._last = 0 // int
    ret._origPtr = 0 // int
    // ret._blockSize100k = 0 // int (0-9); The current block size is 100000 * this number.
    ret._blockRandomised = false // bool
    // bsBuff and bsLive are bit shift values, which the parent handles for us.
    ret._crc = null // CRC
    ret._nInUse = 0 // int
    ret._in = parent
    ret._decompressConcatenated = false // bool
    ret._currentChar = -1 // int
    ret._currentState = FileLib.BZip2Reader._START_BLOCK_STATE // int
    ret._storedBlockCRC = 0 // int
    ret._storedCombinedCRC = 0 // int
    ret._computedBlockCRC = 0 // int
    ret._computedCombinedCRC = 0 // int

    // setup exclusive variables
    ret._su_count = 0 // int
    ret._su_ch2 = 0 // int
    ret._su_chPrev = 0 // int
    ret._su_i2 = 0 // int
    ret._su_j2 = 0 // int
    ret._su_rNToGo = 0 // int
    ret._su_rTPos = 0 // int
    ret._su_tPos = 0 // int
    ret._su_z = " " // char

    // Memory intensive stuff.
    ret._data_inUse = FileLib.BZip2Reader._create_buffer(false, 256) // bool[]
    ret._data_seqToUnseq = FileLib.BZip2Reader._create_buffer(0, 256) // byte[]
    ret._data_selector = FileLib.BZip2Reader._create_buffer(0, FileLib.BZip2Reader._MAX_SELECTORS) // byte[]
    ret._data_selectorMtf = FileLib.BZip2Reader._create_buffer(0, FileLib.BZip2Reader._MAX_SELECTORS) // byte[]
    ret._data_unzftab = FileLib.BZip2Reader._create_buffer(0, 256) // int[]
    ret._data_limit = FileLib.BZip2Reader._create_double_buffer(0, FileLib.BZip2Reader._N_GROUPS, FileLib.BZip2Reader._MAX_ALPHA_SIZE) // int[][]
    ret._data_base = FileLib.BZip2Reader._create_double_buffer(0, FileLib.BZip2Reader._N_GROUPS, FileLib.BZip2Reader._MAX_ALPHA_SIZE) // int[][]
    ret._data_perm = FileLib.BZip2Reader._create_double_buffer(0, FileLib.BZip2Reader._N_GROUPS, FileLib.BZip2Reader._MAX_ALPHA_SIZE) // int[][]
    ret._data_minLens = FileLib.BZip2Reader._create_buffer(0, N_GROUPS) // int[]
    ret._data_cftab = FileLib.BZip2Reader._create_buffer(0, 257) // int[]
    ret._data_getAndMoveToFrontDecode_yy = FileLib.BZip2Reader._create_buffer(" ", 256) // char[]
    ret._data_temp_charArray2d = FileLib.BZip2Reader._create_double_buffer(" ", FileLib.BZip2Reader._N_GROUPS, FileLib.BZip2Reader._MAX_ALPHA_SIZE)// char[][]
    ret._data_recvDecodingTables_pos = FileLib.BZip2Reader._create_buffer(0, N_GROUPS) // byte[]
    ret._data_tt = [] // int[]
    
    ret.load_buffer = @FileLib.BZip2Reader.load_buffer
    ret._initBlock = @FileLib.BZip2Reader._initBlock
    ret._setupBlock = @FileLib.BZip2Reader._setupBlock
    ret._endBlock = @FileLib.BZip2Reader._endBlock
    ret._complete = @FileLib.BZip2Reader._complete
    ret._getAndMoveToFrontDecode = @FileLib.BZip2Reader._getAndMoveToFrontDecode
    ret._reportCRCError = @FileLib.BZip2Reader._reportCRCError
    ret._recvDecodingTables = @FileLib.BZip2Reader._recvDecodingTables
    ret._getAndMoveToFrontDecode0 = @FileLib.BZip2Reader._getAndMoveToFrontDecode0
    ret._setupRandPartA = @FileLib.BZip2Reader._setupRandPartA
    ret._setupRandPartB = @FileLib.BZip2Reader._setupRandPartB
    ret._setupRandPartC = @FileLib.BZip2Reader._setupRandPartC
    ret._setupNoRandPartA = @FileLib.BZip2Reader._setupNoRandPartA
    ret._setupNoRandPartB = @FileLib.BZip2Reader._setupNoRandPartB
    ret._setupNoRandPartC = @FileLib.BZip2Reader._setupNoRandPartC
    ret._makeMaps = @FileLib.BZip2Reader._makeMaps
    ret._createHuffmanDecodingTables = @FileLib.BZip2Reader._createHuffmanDecodingTables
    ret._hbCreateDecodeTables = @FileLib.BZip2Reader._hbCreateDecodeTables
    ret._updateCRC = @FileLib.BZip2Reader._updateCRC

    // instead of exceptions...
    ret.Error = null

    // Initialize the reader based on the data...
    magic2 = parent.NextUInt8
    if magic2 != 'h' then
        print("Stream is not in the BZip2 format")
        return null
    end if
    // This is an ascii number
    c_blockSize = parent.NextUInt8
    ret._blockSize100k = c_blockSize - "0".code
    if ret._blockSize100k < 1 or ret._blockSize100k > 9 then
        print("Stream is not BZip2 formatted: illegal blocksize " + ret._blockSize100k)
        return null
    end if

    ret._data_ll8 = FileLib.BZip2Reader._create_buffer(ret._blockSize100k * FileLib.BZip2Reader._baseBlockSize) // byte[]

    ret._initBlock()
    ret._setupBlock()

end function

FileLib.BZip2Reader._create_buffer = function(init_value, size)
    ret = []
    for i in range(1, size)
        ret.push(init_value)
    end for
    return ret
end function
FileLib.BZip2Reader._create_double_buffer = function(init_value, size1, size2)
    ret = []
    for i in range(1, size1)
        ret.push(FileLib.BZip2Reader._create_buffer(init_value, size2))
    end for
    return ret
end function

FileLib.BZip2Reader._EOF                  = 0
FileLib.BZip2Reader._START_BLOCK_STATE    = 1
FileLib.BZip2Reader._RAND_PART_A_STATE    = 2
FileLib.BZip2Reader._RAND_PART_B_STATE    = 3
FileLib.BZip2Reader._RAND_PART_C_STATE    = 4
FileLib.BZip2Reader._NO_RAND_PART_A_STATE = 5
FileLib.BZip2Reader._NO_RAND_PART_B_STATE = 6
FileLib.BZip2Reader._NO_RAND_PART_C_STATE = 7
FileLib.BZip2Reader._baseBlockSize = 100000

FileLib.BZip2Reader._MAX_ALPHA_SIZE = 258
FileLib.BZip2Reader._MAX_CODE_LEN = 23
FileLib.BZip2Reader._RUNA = 0
FileLib.BZip2Reader._RUNB = 1
FileLib.BZip2Reader._N_ITERS = 4
FileLib.BZip2Reader._N_GROUPS = 6
FileLib.BZip2Reader._G_SIZE = 50
FileLib.BZip2Reader._MAX_SELECTORS = (2 + (900000 / FileLib.BZip2Reader._G_SIZE));
FileLib.BZip2Reader._NUM_OVERSHOOT_BYTES = 20
FileLib.BZip2Reader._rNums = [ 619, 720, 127, 481, 931, 816, 813, 233, 566, 247,
        985, 724, 205, 454, 863, 491, 741, 242, 949, 214,
        733, 859, 335, 708, 621, 574, 73, 654, 730, 472,
        419, 436, 278, 496, 867, 210, 399, 680, 480, 51,
        878, 465, 811, 169, 869, 675, 611, 697, 867, 561,
        862, 687, 507, 283, 482, 129, 807, 591, 733, 623,
        150, 238, 59, 379, 684, 877, 625, 169, 643, 105,
        170, 607, 520, 932, 727, 476, 693, 425, 174, 647,
        73, 122, 335, 530, 442, 853, 695, 249, 445, 515,
        909, 545, 703, 919, 874, 474, 882, 500, 594, 612,
        641, 801, 220, 162, 819, 984, 589, 513, 495, 799,
        161, 604, 958, 533, 221, 400, 386, 867, 600, 782,
        382, 596, 414, 171, 516, 375, 682, 485, 911, 276,
        98, 553, 163, 354, 666, 933, 424, 341, 533, 870,
        227, 730, 475, 186, 263, 647, 537, 686, 600, 224,
        469, 68, 770, 919, 190, 373, 294, 822, 808, 206,
        184, 943, 795, 384, 383, 461, 404, 758, 839, 887,
        715, 67, 618, 276, 204, 918, 873, 777, 604, 560,
        951, 160, 578, 722, 79, 804, 96, 409, 713, 940,
        652, 934, 970, 447, 318, 353, 859, 672, 112, 785,
        645, 863, 803, 350, 139, 93, 354, 99, 820, 908,
        609, 772, 154, 274, 580, 184, 79, 626, 630, 742,
        653, 282, 762, 623, 680, 81, 927, 626, 789, 125,
        411, 521, 938, 300, 821, 78, 343, 175, 128, 250,
        170, 774, 972, 275, 999, 639, 495, 78, 352, 126,
        857, 956, 358, 619, 580, 124, 737, 594, 701, 612,
        669, 112, 134, 694, 363, 992, 809, 743, 168, 974,
        944, 375, 748, 52, 600, 747, 642, 182, 862, 81,
        344, 805, 988, 739, 511, 655, 814, 334, 249, 515,
        897, 955, 664, 981, 649, 113, 974, 459, 893, 228,
        433, 837, 553, 268, 926, 240, 102, 654, 459, 51,
        686, 754, 806, 760, 493, 403, 415, 394, 687, 700,
        946, 670, 656, 610, 738, 392, 760, 799, 887, 653,
        978, 321, 576, 617, 626, 502, 894, 679, 243, 440,
        680, 879, 194, 572, 640, 724, 926, 56, 204, 700,
        707, 151, 457, 449, 797, 195, 791, 558, 945, 679,
        297, 59, 87, 824, 713, 663, 412, 693, 342, 606,
        134, 108, 571, 364, 631, 212, 174, 643, 304, 329,
        343, 97, 430, 751, 497, 314, 983, 374, 822, 928,
        140, 206, 73, 263, 980, 736, 876, 478, 430, 305,
        170, 514, 364, 692, 829, 82, 855, 953, 676, 246,
        369, 970, 294, 750, 807, 827, 150, 790, 288, 923,
        804, 378, 215, 828, 592, 281, 565, 555, 710, 82,
        896, 831, 547, 261, 524, 462, 293, 465, 502, 56,
        661, 821, 976, 991, 658, 869, 905, 758, 745, 193,
        768, 550, 608, 933, 378, 286, 215, 979, 792, 961,
        61, 688, 793, 644, 986, 403, 106, 366, 905, 644,
        372, 567, 466, 434, 645, 210, 389, 550, 919, 135,
        780, 773, 635, 389, 707, 100, 626, 958, 165, 504,
        920, 176, 193, 713, 857, 265, 203, 50, 668, 108,
        645, 990, 626, 197, 510, 357, 358, 850, 858, 364,
        936, 638 ]


// --------------------------------------------
// static functions
FileLib.BZip2Reader._next3 = function(inp)
    v1 = inp.NextBit
    v2 = inp.NextBit
    v3 = inp.NextBit
    if v1 == null or v2 == null or v3 == null then return null
    return (v1 * 4) + (v2 * 2) + v3
end function

FileLib.BZip2Reader._next24 = function(inp)
    v1 = inp.NextUInt8
    v2 = inp.NextUInt8
    v3 = inp.NextUInt8
    if v1 == null or v2 == null or v3 == null then return null
    return (v1 * 65536) + (v2 * 256) + v3
end function

FileLib.BZip2Reader._nextN = function(inp, bit_count)
    // The faster implementation is to inspect the inp to
    // judge the remaining bits to get it to be 0 first then
    // bytes then other.
    ret = 0
    while bit_count > 0
        if bit_count >= 32 then
            data = inp.NextUInt32BE
            gathered = 32
            pow = 4294967296
        else if bit_count >= 24 then
            data = FileLib.BZip2Reader._next24(inp)
            gathered = 24
            pow = 16777216
        else if bit_count >= 16 then
            data = inp.NextUInt16BE
            gathered = 16
            pow = 65536
        else if bit_count >= 8 then
            data = inp.NextUInt8
            gathered = 8
            pow = 256
        else if bit_count >= 3 then
            data = FileLib.BZip2Reader._next3(inp)
            gathered = 3
            pow = 8
        else
            data = inp.NextBit
            gathered = 1
            pow = 2
        end if
        if data == null then return null
        bit_count = bit_count - gathered
        ret = (ret * pow) + data
    end while
    return ret
end function

// ---------------------------------------------
// Methods

// FileLib.BZip2Reader.load_buffer Read the next data into the buffer
FileLib.BZip2Reader.load_buffer = function()
    retChar = self._currentChar

    if self._currentState == FileLib.BZip2Reader._EOF then
        self.read_pos = self.content.len
        return 0
    end if

    if self._currentState == FileLib.BZip2Reader._START_BLOCK_STATE then
        self.Error = "bad state: start block"
        return null
    end if

    if self._currentState == FileLib.BZip2Reader._RAND_PART_A_STATE then
        self.Error = "bad state: rand part a block"
        return null
    end if

    if self._currentState == FileLib.BZip2Reader._RAND_PART_B_STATE then
        self._setupRandPartB()
    end if
    
    if self._currentState == FileLib.BZip2Reader._RAND_PART_C_STATE then
        self._setupRandPartC()
    end if
    
    if self._currentState == FileLib.BZip2Reader._NO_RAND_PART_A_STATE then
        self.Error = "bad state: part a"
        return null
    end if

    if self._currentState == FileLib.BZip2Reader._NO_RAND_PART_B_STATE then
        self._setupNoRandPartB()
    end if
    
    if self._currentState == FileLib.BZip2Reader._NO_RAND_PART_C_STATE then
        self._setupNoRandPartC()
    end if

    return retChar;
end function


FileLib.BZip2Reader._initBlock = function()
    while true
        // Get the block magic bytes.
        magic0 = self._in.NextUInt8
        magic1 = self._in.NextUInt8
        magic2 = self._in.NextUInt8
        magic3 = self._in.NextUInt8
        magic4 = self._in.NextUInt8
        magic5 = self._in.NextUInt8

        // If isn't end of stream magic, break out of the loop.
        // 0x17 - 23
        // 0x72 - 114
        // 0x45 - 69
        // 0x38 - 56
        // 0x50 - 80
        // 0x90 - 144
        if magic0 != 23 or magic1 != 114 or magic2 != 69 or magic3 != 56 or magic4 != 80 or magic5 != 144 then
            break
        end if

        // End of stream was reached. Check the combined CRC and
        // advance to the next .bz2 stream if decoding concatenated
        // streams.
        if self._complete() then
            return true
        end if
    end while

    // 0x31 - 49 '1'
    // 0x41 - 65 ')'
    // 0x59 - 89 'Y'
    // 0x26 - 38 '&'
    // 0x53 - 83 'S'
    // 0x59 - 89 'Y'

    if magic0 != 49 or magic1 != 65 or magic2 != 89 or magic3 != 38 or magic4 != 83 || magic5 != 89 then
        self._currentState = EOF;
        self.Error = "bad block header"
        return null
    else
        self._storedBlockCRC = self._in.NextUInt32BE
        self._blockRandomised = self._in.NextBit == 1

        // currBlockNo++;
        self._getAndMoveToFrontDecode()

        // this.crc.initialiseCRC();
        self._currentState = FileLib.BZip2Reader._START_BLOCK_STATE
    end if
end function

FileLib.BZip2Reader._complete = function()
    self._storedCombinedCRC = self.NextUInt32BE
    self._currentState = FileLib.BZip2Reader._EOF;

    if (self._storedCombinedCRC != self._computedCombinedCRC) then
        self._reportCRCError()
    end if

    // Don't support multiple compressed streams joined.
    return false
end function

FileLib.BZip2Reader._getAndMoveToFrontDecode = function()
    self._origPtr = FileLib.BZip2Reader._next24(self._in)
    self._recvDecodingTables()

    limitLast = self._blockSize100k * 100000

    i = 255
    while i >= 0
        self._data_getAndMoveToFrontDecode_yy[i] = i
        self._data_unzftab[i] = 0
        i = i - 1
    end while

    groupNo     = 0
    groupPos    = FileLib.BZip2Reader._G_SIZE - 1
    eob   = self._nInUse + 1
    nextSym     = self._getAndMoveToFrontDecode0(0)
    lastShadow        = -1
    zt          = self._data_selector[groupNo] % 256
    base_zt   = self._data_base[zt]
    limit_zt  = self._data_limit[zt]
    perm_zt   = self._data_perm[zt]
    minLens_zt  = self._data_minLens[zt]

    while nextSym != eob
        if ((nextSym == FileLib.BZip2Reader._RUNA) or (nextSym == FileLib.BZip2Reader._RUNB)) then
            s = -1
            n = 1
            while true
                if (nextSym == RUNA) then
                    s = s + n
                else if (nextSym == RUNB) then
                    s = s + (n * 2)
                else
                    break
                end if
                n = n * 2
            end while

            n = 1
            while true
                if groupPos == 0 then
                    groupPos    = G_SIZE - 1;
                    groupNo     = groupNo + 1
                    zt          = self._data_selector[groupNo] % 256
                    base_zt     = self._data_base[zt]
                    limit_zt    = self._data_limit[zt]
                    perm_zt     = self._data_perm[zt]
                    minLens_zt  = self._data_minLens[zt]
                else
                    groupPos = groupPos - 1
                end if

                zn = minLens_zt
                zvec = FileLib.BZip2Reader._nextN(self._in, zn)

                // FIXME DOUBLE CHECK THIS LOGIC
                // Looks like zvec is always >
                // Need to ensure the sign bit is recognized.
                while zvec > limit_zt[zn]
                    zn = zn + 1
                    zvec = (zvec * 2) + self._in.NextBit
                end while
                nextSym = perm_zt[zvec - base_zt[zn]]

                n = n * 2
            end while

            ch = self._data_seqToUnseq[self._data_getAndMoveToFrontDecode_yy[0]]
            unzftab[ch % 256] = unzftab[ch % 256] + s + 1

            while s >= 0
                s = s - 1
                self._last = self._last + 1
                self._data_ll8[self._last] = ch;
            end while

            if self._last >= limitLast then
                self.Error = "block overrun"
                return null
            end if
        else
            self._last = self._last + 1
            if self._last >= limitLast then
                self.Error = "block overrun"
                return null
            end if

            tmp = self._data_getAndMoveToFrontDecode_yy[nextSym - 1]
            self._data_unzftab[self._data_seqToUnseq[tmp] % 256] = self._data_unzftab[self._data_seqToUnseq[tmp] % 256] + 1
            self._data_ll8[self._last] = self._data_seqToUnseq[tmp]

            // This loop is hammered during decompression.
            j = nextSym - 1
            while j > 0
                k = j - 1
                self._data_getAndMoveToFrontDecode_yy[j] = self._data_getAndMoveToFrontDecode_yy[k]
                j = k
            end while
            self._data_getAndMoveToFrontDecode_yy[0] = tmp

            if groupPos == 0 then
                groupPos    = FileLib.BZip2Reader._G_SIZE - 1
                groupNo     = groupNo + 1
                zt          = self._data_selector[groupNo] % 256
                base_zt     = self._data_base[zt]
                limit_zt    = self._data_limit[zt]
                perm_zt     = self._data_perm[zt]
                minLens_zt  = self._data_minLens[zt]
            else
                groupPos = groupPos - 1
            end if

            zn = minLens_zt
            zvec = self.FileLib.BZip2Reader._nextN(self._in, zn)

            // FIXME DOUBLE CHECK THIS LOGIC
            // Looks like zvec is always >
            // Need to ensure the sign bit is recognized.
            while zvec > limit_zt[zn]
                zn = zn + 1
                next = self._in.NextBit
                if next == null then
                    self.Error = "unexpected end of stream"
                    return null
                end if
                zvec = (zvec * 2) + next
            end while
            nextSym = perm_zt[zvec - base_zt[zn]]
        end if
    end while
end function

FileLib.BZip2Reader._reportCRCError = function()
    self.Error = "BZip2 CRC error"
    print("BZip2 CRC error")
end function

FileLib.BZip2Reader._recvDecodingTables = function()
    // pos -> recvDecodingTables_pos
    inUse16 = []

    // Receive the mapping table
    for i in range(0, 15)
        bit = self._in.NextBit
        if bit == null then return null
        if bit == 1 then
            inUse16.push(true)
        else
            inUse16.push(false)
        end if
    end for

    for i in self._data_inUse.indexes
        self._data_inUse[i] = false
    end for

    for i in range(0, 15)
        if inUse16[i] then
            i16 = i * 16
            for j in range(0, 15)
                bit = self._in.NextBit
                if bit == null then return null
                if bit then
                    inUse[i16 + j] = true
                end if
            end if
        end if
    end for

    self._makeMaps()
    alphaSize = self._nInUse + 2

    // Now the selectors
    nGroups = FileLib.BZip2Reader._next3(self._in)
    nSelectors = FileLib.BZip2Reader._nextN(self._in, 15)

    for i in range(0, nSelectors - 1)
        j = 0
        while true
            bit = self._in.NextBit
            if bit == null return null
            if bit == 1 then
                j = j + 1
            else
                break
            end if
        end while
        self._data_selectorMtf[i] = j
    end for

    // Undo the MTF values for the selectors
    for v in range(0, nGroups - 1)
        self._data_recvDecodingTables_pos[v] = v
    end for

    for i in range(0, nSelectors - 1)
        v = self._data_selectorMtf[i] % 256
        tmp = self._data_recvDecodingTables_pos[v]
        while v > 0
            self._data_recvDecodingTables_pos[v] = self._data_recvDecodingTables_pos[v - 1]
            v = v - 1
        end while
        self._data_recvDecodingTables_pos[0] = tmp
        self._data_selector[i] = tmp
    end for

    len_table = self._data_temp_charArray2d

    // Now the coding tables
    for t in range(0, nGroups - 1)
        curr = FileLib.BZip2Reader._nextN(self._in, 5)
        len_t = self._data_temp_charArray2d[t]
        for i in range(0, alphaSize - 1)
            while true
                // continue bit
                bit = self._in.NextBit
                if bit == null then return null
                if bit == 0 then break

                // value bit
                bit = self._in.NextBit
                if bit == null then return null
                if bit == 1 then
                    curr = curr - 1
                else
                    curr = curr + 1
                end if
            end while
            len_t[i] = curr
        end for
    end for

    // finally create the Huffman tables
    self._createHuffmanDecodingTables(alphaSize, nGroups)
end function

FileLib.BZip2Reader._getAndMoveToFrontDecode0 = function(groupNo)
    // groupNo: int

    zt = self._datadata_selector[groupNo] % 256
    limit_zt = self._data_limit[zt]
    zn = self._data_minLens[zt]
    zvec = FileLib.BZip2Reader._nextN(self._in, zn)

    // FIXME DOUBLE CHECK THIS LOGIC
    // Looks like zvec is always >
    // Need to ensure the sign bit is recognized.
    while zvec > limit_zt[zn]
        zn = zn + 1
        bit = self._in.NextBit
        if bit == null then return null
        zvec = (zvec * 2) + bit
    end while

    return self._data_perm[zt][zvec - self._data_base[zt][zn]]
end function

FileLib.BZip2Reader._setupBlock = function()
    // Set up _data_tt

    // tt.length should always be >= length, but theoretically
    // it can happen, if the compressor mixed small and large
    // blocks.  Normally only the last block will be smaller
    // than others.
    if self._data_tt == null or self._data_tt.len < self._last + 1 then
        self._data_tt = FileLib.BZip2Reader._create_buffer(0, self._last + 1)
    end if

    self._data_cftab[0] = 0
    // Double check this logic:
    // System.arraycopy(this.data.unzftab, 0, cftab, 1, 256);
    for i in range(0, 255)
        self._data_cftab[i + 1] = self._data_unzftab[i]
    end for

    c = self._data_cftab[0]
    for i in range(1, 256)
        c = c + self._data_cftab[i]
        self._data_cftab[i] = c
    end for

    for i in range(0, self._last)
        idx = self._data_ll8[i] % 256
        c = self._data_cftab[idx]
        c = c + 1
        self._data_cftab[idx] = c
        tt[c] = i
    end for

    if self._origPtr < 0 or self._origPtr >= self._data_tt.len then
        self.Error = "stream corrupted"
        return null
    end if
    
    // =========================================
    // FIXME BELOW HERE

    this.su_tPos = tt[this.origPtr];
    this.su_count = 0;
    this.su_i2 = 0;
    this.su_ch2 = 256;   /* not a char and not EOF */

    if (this.blockRandomised) {
        this.su_rNToGo = 0;
        this.su_rTPos = 0;
        setupRandPartA();
    } else {
        setupNoRandPartA();
    }

    // FIXME ABOVE HERE
    // =========================================

end function

FileLib.BZip2Reader._endBlock = function()
    self._computedBlockCRC = self._getFinalCRC()

    // A bad CRC is considered a fatal error.
    if self._storedBlockCRC != self._computedBlockCRC then
        // make next blocks readable without error
        // (repair feature, not yet documented, not tested)
        self._computedCombinedCRC = (self._storedCombinedCRC * 2) + floor(self._storedCombinedCRC / FileLib._pow2[31])
        // FIXME HANDLE XOR
        self._computedCombinedCRC ^= self._storedBlockCRC

        self._reportCRCError()
    end if

    self._computedCombinedCRC = (self._computedCombinedCRC * 2) + floor(self._computedCombinedCRC / FileLib._pow2[31])
    // FIXME HANDLE XOR
    self._computedCombinedCRC ^= self.computedBlockCRC
end function

FileLib.BZip2Reader._setupRandPartA = function()
end function

FileLib.BZip2Reader._setupRandPartB = function()
    if self._su_ch2 != self._su_chPrev then
        self._currentState = FileLib.BZip2Reader._RAND_PART_A_STATE
        self._su_count = 1
        self._setupRandPartA()
        return
    end if
    self._su_count = self._su_count + 1
    if self._su_count >= 4 then
        self._su_z = self._data_ll8[self._su_tPos] % 256
        self._su_tPos = self._data_tt[self._su_tPos]
        if self._su_rNToGo == 0 then
            self._su_rNToGo = FileLib.BZip2Reader._rNums[self._su_rTPos] - 1
            self._su_rTPos = self._su_rTPos + 1
            if self._su_rTPos == 512 then self._su_rTPos = 0
        else
            self._su_rNToGo = self._su_rNToGo - 1
        end if
        self._su_j2 = 0
        self._currentState = FileLib.BZip2Reader._RAND_PART_C_STATE
        if self._su_rNToGo == 1 then
            // UM.....
            // FIXME this is an xor operation.
            this.su_z ^= 1;
        end if
        self._setupRandPartC()
    else
        self._currentState = FileLib.BZip2Reader._RAND_PART_A_STATE
        self._setupRandPartA()
    end if
end function

FileLib.BZip2Reader._setupRandPartC = function()
    if self._su_j2 < self._su_z then
        self._currentChar = self._su_ch2
        self._updateCRC(self._su_ch2)
        self._su_j2 = self._su_j2 + 1
    else
        self._currentState = FileLib.BZip2Reader._RAND_PART_A_STATE
        self._su_i2 = self._su_i2 + 1
        self._su_count = 0
        self._setupRandPartA()
    end if
end function

FileLib.BZip2Reader._setupNoRandPartA = function()
    if self._su_i2 <= self._last then
        self._su_chPrev = self._su_ch2
        su_ch2Shadow = self._data_ll8[self._su_tPos] % 256
        self._su_ch2 = su_ch2Shadow
        self._su_tPos = self._data_tt[this.su_tPos]
        self._su_i2 = self._su_i2 + 1
        self._currentChar = su_ch2Shadow;
        self._currentState = FileLib.BZip2Reader._NO_RAND_PART_B_STATE
        self._updateCRC(su_ch2Shadow)
    else
        self._currentState = FileLib.BZip2Reader._NO_RAND_PART_A_STATE
        self._endBlock()
        self._initBlock()
        self._setupBlock()
    end if
end function


FileLib.BZip2Reader._setupNoRandPartB = function()
    if self._su_ch2 != self._su_chPrev then
        self._su_count = 1
        self._setupNoRandPartA()
    else
        self._su_count = self._su_count + 1
        if (self._su_count >= 4) then
            self._su_z = self._data_ll8[self._su_tPos] % 256
            self._su_tPos = self._data_tt[self._su_tPos]
            self._su_j2 = 0
            self._setupNoRandPartC()
        else
            self._setupNoRandPartA()
        end if
    end if
end function

FileLib.BZip2Reader._setupNoRandPartC = function()
    if self._su_j2 < self._su_z then
        self._currentChar = self._su_ch2
        self._updateCRC(self._su_ch2)
        self._su_j2++
        this.currentState = FileLib.BZip2Reader._NO_RAND_PART_C_STATE
    else
        this.su_i2++;
        this.su_count = 0;
        self._setupNoRandPartA()
    end if
end function

FileLib.BZip2Reader._makeMaps = function()
    self._nInUse = 0
    for i in range(0, 255)
        if self._data_inUse[i] then
            self._data_seqToUnseq[self._nInUse] = i
            self._nInUse = self._nInUse + 1
        end if
    end for
end function

FileLib.BZip2Reader._createHuffmanDecodingTables = function(alphaSize, nGroups)
    for t in range(0, nGroups - 1)
        minLen = 32
        maxLen = 0
        len_t = self._data_temp_charArray2d[t]
        for i in range(0, alphaSize - 1)
            lent = len_t[i]
            if lent > maxLen then maxLen = lent
            if lent < minLen then minLen = lent
        end for
        self._hbCreateDecodeTables(self._data_limit[t], self._data_base[t], self._data_perm[t], self._data_temp_charArray2d[t], minLen, maxLen, alphaSize)
        self._data_minLens[t] = minLen
    end for
end function

FileLib.BZip2Reader._hbCreateDecodeTables = function(limit, base, perm, length, minLen, maxLen, alphaSize)
    // limit: int[]
    // base: int[]
    // perm: int[]
    // length: uint16[]
    // minLen: int
    // maxLen: int
    // alphaSize: int
    pp = 0
    for i in range(minLen, maxLen)
        for j in range(0, alphaSize - 1)
            if length[j] == i then
                perm[pp] = j
                pp = pp + 1
            end if
        end for
    end for

    for i in range(0, FileLib.BZip2Reader._MAX_CODE_LEN - 1)
        base[i] = 0
        limit[i] = 0
    end for

    for i in range(0, alphaSize - 1)
        base[length[i] + 1] = base[length[i] + 1] + 1
    end for

    b = base[0]
    for i in range(1, FileLib.BZip2Reader._MAX_CODE_LEN - 1)
        b = b + base[i]
        base[i] = b
    end for

    vec = 0
    b = base[minLen]
    for i in range(minLen, maxLen)
        nb = base[i + 1]
        vec = nb - b
        b = nb
        limit[i] = vec - 1
        vec = vec * 2
    end for

    for i in range(minLen + 1, maxLen)
        base[i] = ((limit[i - 1] + 1) << 1) - base[i]
    end for
end function

FileLib.BZip2Reader._updateCRC = function(value)
    // TODO implement CRC
end function

FileLib.BZip2Reader._finalCRC = function()
    // TODO implement CRC
    return 0
end function


// ============================================
// FIXME FINISH MOVING BELOW TO UP.




public class CBZip2InputStream extends InputStream implements BZip2Constants {
    // Variables used by setup* methods exclusively


    @Override
    public void close() throws IOException {
        InputStream inShadow = this.in;
        if (inShadow != null) {
            try {
                if (inShadow != System.in) {
                    inShadow.close();
                }
            } finally {
                this.data = null;
                this.in = null;
            }
        }
    }

    private void setupRandPartA() throws IOException {
        if (this.su_i2 <= this.last) {
            this.su_chPrev = this.su_ch2;
            int su_ch2Shadow = this.data.ll8[this.su_tPos] & 0xff;
            this.su_tPos = this.data.tt[this.su_tPos];
            if (this.su_rNToGo == 0) {
                this.su_rNToGo = BZip2Constants.rNums[this.su_rTPos] - 1;
                if (++this.su_rTPos == 512) {
                    this.su_rTPos = 0;
                }
            } else {
                this.su_rNToGo--;
            }
            this.su_ch2 = su_ch2Shadow ^= (this.su_rNToGo == 1) ? 1 : 0;
            this.su_i2++;
            this.currentChar = su_ch2Shadow;
            this.currentState = RAND_PART_B_STATE;
            this.crc.updateCRC(su_ch2Shadow);
        } else {
            endBlock();
            initBlock();
            setupBlock();
        }
    }
