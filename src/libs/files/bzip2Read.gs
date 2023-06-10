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
    ret._bsBuff = 0 // int
    ret._bsLive = 0 // int
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
    ret._complete = @FileLib.BZip2Reader._complete
    ret._getAndMoveToFrontDecode = @FileLib.BZip2Reader._getAndMoveToFrontDecode
    ret._reportCRCError = @FileLib.BZip2Reader._reportCRCError
    ret._recvDecodingTables = @FileLib.BZip2Reader._recvDecodingTables
    ret._getAndMoveToFrontDecode0 = @FileLib.BZip2Reader._getAndMoveToFrontDecode0
    ret._setupRandPartB = @FileLib.BZip2Reader._setupRandPartB
    ret._setupRandPartC = @FileLib.BZip2Reader._setupRandPartC
    ret._setupNoRandPartB = @FileLib.BZip2Reader._setupNoRandPartB
    ret._setupNoRandPartC = @FileLib.BZip2Reader._setupNoRandPartC

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
int NUM_OVERSHOOT_BYTES = 20

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

// static function
FileLib.BZip2Reader._next24 = function(inp)
    v1 = inp.NextUInt8
    v2 = inp.NextUInt8
    v3 = inp.NextUInt8
    if v1 == null or v2 == null or v3 == null then return null
    return (v1 * 65536) + (v2 * 256) + v3
end function

FileLib.BZip2Reader._getAndMoveToFrontDecode = function()
    self._origPtr = FileLib.BZip2Reader._next24(self._in)
    self._recvDecodingTables()

    limitLast = self._blockSize100k * 100000

    i = 255
    while i >= 0
        self._data_yy[i] = i
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
        if ((nextSym == FileLib.BZip2Reader._RUNA) || (nextSym == FileLib.BZip2Reader._RUNB)) then
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

            for (int n = 1; true; n <<= 1) {

                if (groupPos == 0) {
                    groupPos    = G_SIZE - 1;
                    zt          = selector[++groupNo] & 0xff;
                    base_zt     = base[zt];
                    limit_zt    = limit[zt];
                    perm_zt     = perm[zt];
                    minLens_zt  = minLens[zt];
                } else {
                    groupPos--;
                }

                int zn = minLens_zt;

                // Inlined:
                // int zvec = bsR(zn);
                while (bsLiveShadow < zn) {
                    final int thech = inShadow.read();
                    if (thech >= 0) {
                        bsBuffShadow = (bsBuffShadow << 8) | thech;
                        bsLiveShadow += 8;
                        continue;
                    } else {
                        throw new IOException("unexpected end of stream");
                    }
                }
                int zvec = (bsBuffShadow >> (bsLiveShadow - zn)) & ((1 << zn) - 1);
                bsLiveShadow -= zn;

                while (zvec > limit_zt[zn]) {
                    zn++;
                    while (bsLiveShadow < 1) {
                        final int thech = inShadow.read();
                        if (thech >= 0) {
                            bsBuffShadow = (bsBuffShadow << 8) | thech;
                            bsLiveShadow += 8;
                            continue;
                        } else {
                            throw new IOException("unexpected end of stream");
                        }
                    }
                    bsLiveShadow--;
                    zvec = (zvec << 1) | ((bsBuffShadow >> bsLiveShadow) & 1);
                }
                nextSym = perm_zt[zvec - base_zt[zn]];
            }

            final byte ch = seqToUnseq[yy[0]];
            unzftab[ch & 0xff] += s + 1;

            while (s-- >= 0) {
                ll8[++lastShadow] = ch;
            }

            if (lastShadow >= limitLast) {
                throw new IOException("block overrun");
            }
        else
            if (++lastShadow >= limitLast) {
                throw new IOException("block overrun");
            }

            final char tmp = yy[nextSym - 1];
            unzftab[seqToUnseq[tmp] & 0xff]++;
            ll8[lastShadow] = seqToUnseq[tmp];

            /*
                This loop is hammered during decompression,
                hence avoid native method call overhead of
                System.arraycopy for very small ranges to copy.
            */
            if (nextSym <= 16) {
                for (int j = nextSym - 1; j > 0;) {
                    yy[j] = yy[--j];
                }
            } else {
                System.arraycopy(yy, 0, yy, 1, nextSym - 1);
            }

            yy[0] = tmp;

            if (groupPos == 0) {
                groupPos    = G_SIZE - 1;
                zt          = selector[++groupNo] & 0xff;
                base_zt     = base[zt];
                limit_zt    = limit[zt];
                perm_zt     = perm[zt];
                minLens_zt  = minLens[zt];
            } else {
                groupPos--;
            }

            int zn = minLens_zt;

            // Inlined:
            // int zvec = bsR(zn);
            while (bsLiveShadow < zn) {
                final int thech = inShadow.read();
                if (thech >= 0) {
                    bsBuffShadow = (bsBuffShadow << 8) | thech;
                    bsLiveShadow += 8;
                    continue;
                } else {
                    throw new IOException("unexpected end of stream");
                }
            }
            int zvec = (bsBuffShadow >> (bsLiveShadow - zn)) & ((1 << zn) - 1);
            bsLiveShadow -= zn;

            while (zvec > limit_zt[zn]) {
                zn++;
                while (bsLiveShadow < 1) {
                    final int thech = inShadow.read();
                    if (thech >= 0) {
                        bsBuffShadow = (bsBuffShadow << 8) | thech;
                        bsLiveShadow += 8;
                        continue;
                    } else {
                        throw new IOException("unexpected end of stream");
                    }
                }
                bsLiveShadow--;
                zvec = (zvec << 1) | ((bsBuffShadow >> bsLiveShadow) & 1);
            }
            nextSym = perm_zt[zvec - base_zt[zn]];
        end if
    end while
end function

FileLib.BZip2Reader._reportCRCError = function()
    print("BZip2 CRC error")
end function

FileLib.BZip2Reader._recvDecodingTables = function()
end function

FileLib.BZip2Reader._getAndMoveToFrontDecode0 = function()
end function

FileLib.BZip2Reader._setupBlock = function()
end function

FileLib.BZip2Reader._setupRandPartB = function()
end function

FileLib.BZip2Reader._setupRandPartC = function()
end function

FileLib.BZip2Reader._setupNoRandPartB = function()
end function

FileLib.BZip2Reader._setupNoRandPartC = function()
end function










public class CBZip2InputStream extends InputStream implements BZip2Constants {
    // Variables used by setup* methods exclusively



    private void makeMaps() {
        final boolean[] inUse   = this.data.inUse;
        final byte[] seqToUnseq = this.data.seqToUnseq;

        int nInUseShadow = 0;

        for (int i = 0; i < 256; i++) {
            if (inUse[i]) {
                seqToUnseq[nInUseShadow++] = (byte) i;
            }
        }

        this.nInUse = nInUseShadow;
    }

    private void endBlock() throws IOException {
        this.computedBlockCRC = this.crc.getFinalCRC();

        // A bad CRC is considered a fatal error.
        if (this.storedBlockCRC != this.computedBlockCRC) {
            // make next blocks readable without error
            // (repair feature, not yet documented, not tested)
            this.computedCombinedCRC
                = (this.storedCombinedCRC << 1)
                | (this.storedCombinedCRC >>> 31);
            this.computedCombinedCRC ^= this.storedBlockCRC;

            reportCRCError();
        }

        this.computedCombinedCRC
            = (this.computedCombinedCRC << 1)
            | (this.computedCombinedCRC >>> 31);
        this.computedCombinedCRC ^= this.computedBlockCRC;
    }

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

    /**
        * Called by createHuffmanDecodingTables() exclusively.
        */
    private static void hbCreateDecodeTables(final int[] limit,
                                                final int[] base,
                                                final int[] perm,
                                                final char[] length,
                                                final int minLen,
                                                final int maxLen,
                                                final int alphaSize) {
        for (int i = minLen, pp = 0; i <= maxLen; i++) {
            for (int j = 0; j < alphaSize; j++) {
                if (length[j] == i) {
                    perm[pp++] = j;
                }
            }
        }

        for (int i = MAX_CODE_LEN; --i > 0;) {
            base[i] = 0;
            limit[i] = 0;
        }

        for (int i = 0; i < alphaSize; i++) {
            base[length[i] + 1]++;
        }

        for (int i = 1, b = base[0]; i < MAX_CODE_LEN; i++) {
            b += base[i];
            base[i] = b;
        }

        for (int i = minLen, vec = 0, b = base[i]; i <= maxLen; i++) {
            final int nb = base[i + 1];
            vec += nb - b;
            b = nb;
            limit[i] = vec - 1;
            vec <<= 1;
        }

        for (int i = minLen + 1; i <= maxLen; i++) {
            base[i] = ((limit[i - 1] + 1) << 1) - base[i];
        }
    }

    private void recvDecodingTables() throws IOException {
        final Data dataShadow     = this.data;
        final boolean[] inUse     = dataShadow.inUse;
        final byte[] pos          = dataShadow.recvDecodingTables_pos;
        final byte[] selector     = dataShadow.selector;
        final byte[] selectorMtf  = dataShadow.selectorMtf;

        int inUse16 = 0;

        /* Receive the mapping table */
        for (int i = 0; i < 16; i++) {
            if (bsGetBit()) {
                inUse16 |= 1 << i;
            }
        }

        for (int i = 256; --i >= 0;) {
            inUse[i] = false;
        }

        for (int i = 0; i < 16; i++) {
            if ((inUse16 & (1 << i)) != 0) {
                final int i16 = i << 4;
                for (int j = 0; j < 16; j++) {
                    if (bsGetBit()) {
                        inUse[i16 + j] = true;
                    }
                }
            }
        }

        makeMaps();
        final int alphaSize = this.nInUse + 2;

        /* Now the selectors */
        final int nGroups = bsR(3);
        final int nSelectors = bsR(15);

        for (int i = 0; i < nSelectors; i++) {
            int j = 0;
            while (bsGetBit()) {
                j++;
            }
            selectorMtf[i] = (byte) j;
        }

        /* Undo the MTF values for the selectors. */
        for (int v = nGroups; --v >= 0;) {
            pos[v] = (byte) v;
        }

        for (int i = 0; i < nSelectors; i++) {
            int v = selectorMtf[i] & 0xff;
            final byte tmp = pos[v];
            while (v > 0) {
                // nearly all times v is zero, 4 in most other cases
                pos[v] = pos[v - 1];
                v--;
            }
            pos[0] = tmp;
            selector[i] = tmp;
        }

        final char[][] len  = dataShadow.temp_charArray2d;

        /* Now the coding tables */
        for (int t = 0; t < nGroups; t++) {
            int curr = bsR(5);
            final char[] len_t = len[t];
            for (int i = 0; i < alphaSize; i++) {
                while (bsGetBit()) {
                    curr += bsGetBit() ? -1 : 1;
                }
                len_t[i] = (char) curr;
            }
        }

        // finally create the Huffman tables
        createHuffmanDecodingTables(alphaSize, nGroups);
    }

    /**
        * Called by recvDecodingTables() exclusively.
        */
    private void createHuffmanDecodingTables(final int alphaSize,
                                                final int nGroups) {
        final Data dataShadow = this.data;
        final char[][] len  = dataShadow.temp_charArray2d;
        final int[] minLens = dataShadow.minLens;
        final int[][] limit = dataShadow.limit;
        final int[][] base  = dataShadow.base;
        final int[][] perm  = dataShadow.perm;

        for (int t = 0; t < nGroups; t++) {
            int minLen = 32;
            int maxLen = 0;
            final char[] len_t = len[t];
            for (int i = alphaSize; --i >= 0;) {
                final char lent = len_t[i];
                if (lent > maxLen) {
                    maxLen = lent;
                }
                if (lent < minLen) {
                    minLen = lent;
                }
            }
            hbCreateDecodeTables(limit[t], base[t], perm[t], len[t], minLen,
                                    maxLen, alphaSize);
            minLens[t] = minLen;
        }
    }

    private int getAndMoveToFrontDecode0(final int groupNo)
        throws IOException {
        final InputStream inShadow  = this.in;
        final Data dataShadow  = this.data;
        final int zt          = dataShadow.selector[groupNo] & 0xff;
        final int[] limit_zt  = dataShadow.limit[zt];
        int zn = dataShadow.minLens[zt];
        int zvec = bsR(zn);
        int bsLiveShadow = this.bsLive;
        int bsBuffShadow = this.bsBuff;

        while (zvec > limit_zt[zn]) {
            zn++;
            while (bsLiveShadow < 1) {
                final int thech = inShadow.read();

                if (thech >= 0) {
                    bsBuffShadow = (bsBuffShadow << 8) | thech;
                    bsLiveShadow += 8;
                    continue;
                } else {
                    throw new IOException("unexpected end of stream");
                }
            }
            bsLiveShadow--;
            zvec = (zvec << 1) | ((bsBuffShadow >> bsLiveShadow) & 1);
        }

        this.bsLive = bsLiveShadow;
        this.bsBuff = bsBuffShadow;

        return dataShadow.perm[zt][zvec - dataShadow.base[zt][zn]];
    }

    private void setupBlock() throws IOException {
        if (this.data == null) {
            return;
        }

        final int[] cftab = this.data.cftab;
        final int[] tt    = this.data.initTT(this.last + 1);
        final byte[] ll8  = this.data.ll8;
        cftab[0] = 0;
        System.arraycopy(this.data.unzftab, 0, cftab, 1, 256);

        for (int i = 1, c = cftab[0]; i <= 256; i++) {
            c += cftab[i];
            cftab[i] = c;
        }

        for (int i = 0, lastShadow = this.last; i <= lastShadow; i++) {
            tt[cftab[ll8[i] & 0xff]++] = i;
        }

        if ((this.origPtr < 0) || (this.origPtr >= tt.length)) {
            throw new IOException("stream corrupted");
        }

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

    private void setupNoRandPartA() throws IOException {
        if (this.su_i2 <= this.last) {
            this.su_chPrev = this.su_ch2;
            int su_ch2Shadow = this.data.ll8[this.su_tPos] & 0xff;
            this.su_ch2 = su_ch2Shadow;
            this.su_tPos = this.data.tt[this.su_tPos];
            this.su_i2++;
            this.currentChar = su_ch2Shadow;
            this.currentState = NO_RAND_PART_B_STATE;
            this.crc.updateCRC(su_ch2Shadow);
        } else {
            this.currentState = NO_RAND_PART_A_STATE;
            endBlock();
            initBlock();
            setupBlock();
        }
    }

    private void setupRandPartB() throws IOException {
        if (this.su_ch2 != this.su_chPrev) {
            this.currentState = RAND_PART_A_STATE;
            this.su_count = 1;
            setupRandPartA();
        } else if (++this.su_count >= 4) {
            this.su_z = (char) (this.data.ll8[this.su_tPos] & 0xff);
            this.su_tPos = this.data.tt[this.su_tPos];
            if (this.su_rNToGo == 0) {
                this.su_rNToGo = BZip2Constants.rNums[this.su_rTPos] - 1;
                if (++this.su_rTPos == 512) {
                    this.su_rTPos = 0;
                }
            } else {
                this.su_rNToGo--;
            }
            this.su_j2 = 0;
            this.currentState = RAND_PART_C_STATE;
            if (this.su_rNToGo == 1) {
                this.su_z ^= 1;
            }
            setupRandPartC();
        } else {
            this.currentState = RAND_PART_A_STATE;
            setupRandPartA();
        }
    }

    private void setupRandPartC() throws IOException {
        if (this.su_j2 < this.su_z) {
            this.currentChar = this.su_ch2;
            this.crc.updateCRC(this.su_ch2);
            this.su_j2++;
        } else {
            this.currentState = RAND_PART_A_STATE;
            this.su_i2++;
            this.su_count = 0;
            setupRandPartA();
        }
    }

    private void setupNoRandPartB() throws IOException {
        if (this.su_ch2 != this.su_chPrev) {
            this.su_count = 1;
            setupNoRandPartA();
        } else if (++this.su_count >= 4) {
            this.su_z = (char) (this.data.ll8[this.su_tPos] & 0xff);
            this.su_tPos = this.data.tt[this.su_tPos];
            this.su_j2 = 0;
            setupNoRandPartC();
        } else {
            setupNoRandPartA();
        }
    }

    private void setupNoRandPartC() throws IOException {
        if (this.su_j2 < this.su_z) {
            int su_ch2Shadow = this.su_ch2;
            this.currentChar = su_ch2Shadow;
            this.crc.updateCRC(su_ch2Shadow);
            this.su_j2++;
            this.currentState = NO_RAND_PART_C_STATE;
        } else {
            this.su_i2++;
            this.su_count = 0;
            setupNoRandPartA();
        }
    }

    private static final class Data extends Object {

        // (with blockSize 900k)
        final boolean[] inUse   = new boolean[256];                                   //      256 byte

        final byte[] seqToUnseq   = new byte[256];                                    //      256 byte
        final byte[] selector     = new byte[MAX_SELECTORS];                          //    18002 byte
        final byte[] selectorMtf  = new byte[MAX_SELECTORS];                          //    18002 byte

        /**
            * Freq table collected to save a pass over the data during
            * decompression.
            */
        final int[] unzftab = new int[256];                                           //     1024 byte

        final int[][] limit = new int[N_GROUPS][MAX_ALPHA_SIZE];                      //     6192 byte
        final int[][] base  = new int[N_GROUPS][MAX_ALPHA_SIZE];                      //     6192 byte
        final int[][] perm  = new int[N_GROUPS][MAX_ALPHA_SIZE];                      //     6192 byte
        final int[] minLens = new int[N_GROUPS];                                      //       24 byte

        final int[]     cftab     = new int[257];                                     //     1028 byte
        final char[]    getAndMoveToFrontDecode_yy = new char[256];                   //      512 byte
        final char[][]  temp_charArray2d  = new char[N_GROUPS][MAX_ALPHA_SIZE];       //     3096 byte
        final byte[] recvDecodingTables_pos = new byte[N_GROUPS];                     //        6 byte
        //---------------
        //    60798 byte

        int[] tt;                                                                     //  3600000 byte
        byte[] ll8;                                                                   //   900000 byte
        //---------------
        //  4560782 byte
        //===============

        Data(int blockSize100k) {
            super();

            this.ll8 = new byte[blockSize100k * BZip2Constants.baseBlockSize];
        }

        /**
            * Initializes the {@link #tt} array.
            *
            * This method is called when the required length of the array
            * is known.  I don't initialize it at construction time to
            * avoid unnecessary memory allocation when compressing small
            * files.
            */
        final int[] initTT(int length) {
            int[] ttShadow = this.tt;

            // tt.length should always be >= length, but theoretically
            // it can happen, if the compressor mixed small and large
            // blocks.  Normally only the last block will be smaller
            // than others.
            if ((ttShadow == null) || (ttShadow.length < length)) {
                this.tt = ttShadow = new int[length];
            }

            return ttShadow;
        }

    }
