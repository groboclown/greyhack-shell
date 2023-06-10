// "Binary" file reader.
// Allows for pulling in encoded text and turning it into
// binary data.

if not globals.hasIndex("FileLib") then globals.FileLib = {}
FileLib.BinaryReader = {}

// FileLib.BinaryReader.New() Creates a new binary reader.
//
// The argument can be a file-like object (a map with a 'get_content' member)
// or the contents as a string.
// Returns "null" on error.
FileLib.BinaryReader.New = function(fileOrContents)
    if fileOrContents isa map and fileOrContents.hasIndex("get_content") then
        fileOrContents = fileOrContents.get_content
    end if
    if fileOrContents == null or not fileOrContents isa string then
        return null
    end if
    ret = new FileLib.BinaryReader
    ret.content = fileOrContents

    // read_pos the next character position in the content list.
    ret.read_pos = 0

    // buffer_bit_size The number of bits of data for each number read into
    //   the buffer.  This cannot be greater than 31.
    ret.buffer_bit_size = 8

    // buffer the raw numbers transcoded from the content,
    //   appended to the end as read.  Each
    ret.buffer = []

    // remaining_bits number of bits in the (partial_data) value.
    ret.remaining_bits = 0
    // partial_data a value that used to be in the buffer, which had some
    // data pulled off of it.  It has (remaining_bits) number of bits left.
    ret.partial_data = 0
    return ret
end function

// FileLib.BinaryReader.is_ignored() Is the given character ignored for the encoding?
//
// Returns true if the character should be ignored for the purposes of the binary encoding.
FileLib.BinaryReader.is_ignored = function(c)
    // Ignore whitespace
    ic = c.code
    return c == " " or ic == 10 or ic == 13 or ic == 9
end function

// FileLib.BinaryReader.HasMore() is there more data to read?
FileLib.BinaryReader.HasMore = function()
    // If there's buffered data, then there's stuff pending to 
    if self.remaining_bits > 0 or self.buffer.len > 0 then return true
    // Is this a valid read position?
    while self.read_pos < self.content.len
        // Is this a non-ignored character?
        if not self.is_ignored(self.content[self.read_pos]) then return true
        // It's ignored.  Advance and see if the next one is ignored.
        self.read_pos = self.read_pos + 1
    end while
    return false
end function

// FileLib.BinaryReader.buffer_bit_count() Counts the number of bits of data in the buffer
FileLib.BinaryReader.buffer_bit_count = function()
    return self.remaining_bits + (self.buffer.len * self.buffer_bit_size)
end function

// FileLib.BinaryReader.fill_buffer() Load up data into the buffer.
//
// Returns true if there is enough data in the buffer
//
// Calls into load_buffer to ensure at least (bit_count) bits are in the
// buffer.
FileLib.BinaryReader.fill_buffer = function(bit_count)
    while self.buffer_bit_count < bit_count
        res = self.load_buffer()
        if res == null or res <= 0 then
            // ran out of data
            return false
        end if
    end while
    return true
end function

// FileLib.BinaryReader.load_buffer() load numbers into the buffer
// Abstract function - must be implemented by the subclass.
//
// (buffer) stores numbers that have (buffer_bit_size) bits of useful
// data in each one.  Calls to the binary reader will consume bits out of
// the buffer.  Each call to this laod_buffer will load whole
// number of (buffer_bit_size) bit values.  That is, if (buffer_bit_size)
// is 12, then each call will append 0 or more values to the end of the
// (buffer), each one with 12 useful bits of data.
//
// The call must ensure that the (buffer) values do not have extra data
// beyond the (buffer_bit_size); that is, if the number of bits is 3 (0-7),
// then each value must be restricted to the values 0-7.  This eliminates
// extra math operations.
//
// Returns the number of values added to the (buffer).
FileLib.BinaryReader.load_buffer = function()
    return 0
end function

// binary operation optimizations...
FileLib._pow2 = [
    1,          // << 0
    2,          // << 1
    4,          // << 2
    8,          // << 3
    16,         // << 4
    32,         // << 5
    64,         // << 6
    128,        // << 7
    256,        // << 8
    512,        // << 9
    1024,       // << 10
    2048,       // << 11
    4096,       // << 12
    8192,       // << 13
    16384,      // << 14
    32768,      // << 15
    65536,      // << 16
    131072,     // << 17
    262144,     // << 18
    524288,     // << 19
    1048576,    // << 20
    2097152,    // << 21
    4194304,    // << 22
    8388608,    // << 23
    16777216,   // << 24
    33554432,   // << 25
    67108864,   // << 26
    134217728,  // << 27
    268435456,  // << 28
    536870912,  // << 29
    1073741824, // << 30
    2147483648, // << 31
    4294967296, // << 32
]

// FileLib.BinaryReader.NextBit() reads the next 0 or 1 (bit) value, or null
FileLib.BinaryReader.NextBit = function()
    if not self.fill_buffer(1) then return null
    if self.remaining_bits <= 0 then
        // data was put into the buffer.  Need to remove the first
        // item from the buffer.
        self.remaining_bits = self.buffer_bit_size
        self.partial_data = self.buffer[0]
        self.buffer.remove(0)
    end if
    ret = floor(self.partial_data / FileLib._pow2[self.remaining_bits - 1]) % 2
    if self.remaining_bits > 1 then
        self.remaining_bits = self.remaining_bits - 1
        self.partial_data = self.partial_data % FileLib._pow2[self.remaining_bits]
    else
        // must be == 1
        self.remaining_bits = 0
        self.partial_data = 0
    end if
    return ret
end function

// FileLib.BinaryReader.NextUInt8() reads the next uint8 value, or null
FileLib.BinaryReader.NextUInt8 = function()
    if not self.fill_buffer(8) then return null
    while self.remaining_bits < 8
        // Need to add more bits.
        // Not performing buffer checks, because fill_buffer should have
        // given us at least 8 more bits to work with in the buffer +
        // remaining bits.
        self.remaining_bits = self.remaining_bits + self.buffer_bit_size
        self.partial_data = ((self.partial_data * FileLib._pow2[self.buffer_bit_size]) + self.buffer[0])
        self.buffer.remove(0)
    end while
    // Strip off the top 8 bits
    ret = floor(self.partial_data / FileLib._pow2[self.remaining_bits - 8]) % 256
    if self.remaining_bits > 8 then
        self.remaining_bits = self.remaining_bits - 8
        self.partial_data = self.partial_data % FileLib._pow2[self.remaining_bits]
    else
        // must be == 8...
        self.remaining_bits = 0
        self.partial_data = 0
    end if
    return ret
end function

// FileLib.BinaryReader.NextUInt16BE() reads the next uint16 value, or null
//
// Uses "big endian" formatting.
FileLib.BinaryReader.NextUInt16BE = function()
    if not self.fill_buffer(16) then return null
    while self.remaining_bits < 16
        // Need to add more bits.
        // Not performing buffer checks, because fill_buffer should have
        // given us at least 8 more bits to work with in the buffer +
        // remaining bits.
        self.remaining_bits = self.remaining_bits + self.buffer_bit_size
        self.partial_data = ((self.partial_data * FileLib._pow2[self.buffer_bit_size]) + self.buffer[0])
        self.buffer.remove(0)
    end while
    // Strip off the top 16 bits
    ret = floor(self.partial_data / FileLib._pow2[self.remaining_bits - 16]) % 65536
    if self.remaining_bits > 16 then
        self.remaining_bits = self.remaining_bits - 16
        self.partial_data = self.partial_data % FileLib._pow2[self.remaining_bits]
    else
        // must be == 16...
        self.remaining_bits = 0
        self.partial_data = 0
    end if
    return ret
end function

// FileLib.BinaryReader.NextUInt16LE() reads the next uint16 value, or null
//
// Uses "little endian" formatting.
FileLib.BinaryReader.NextUInt16LE = function()
    low = self.NextUInt8()
    hi = self.NextUInt8()
    return hi * 256 + low
end function

// FileLib.BinaryReader.NextSInt8() reads the next int8 value (signed), or null
//
// Uses 2's complement method.  This returns numbers in the range [-128, 127].
FileLib.BinaryReader.NextSInt8 = function()
    ret = self.NextUInt8()
    if ret > 127 then
        return ret - 256
    end if
    return ret
end function

// FileLib.BinaryReader.NextUInt32BE() reads the next uint32 value, or null
//
// Uses "big endian" formatting.
FileLib.BinaryReader.NextUInt32BE = function()
    if not self.fill_buffer(32) then return null
    while self.remaining_bits < 32
        // Need to add more bits.
        // Not performing buffer checks, because fill_buffer should have
        // given us at least 8 more bits to work with in the buffer +
        // remaining bits.
        self.remaining_bits = self.remaining_bits + self.buffer_bit_size
        self.partial_data = ((self.partial_data * FileLib._pow2[self.buffer_bit_size]) + self.buffer[0])
        self.buffer.remove(0)
    end while
    // Strip off the top 32 bits
    ret = floor(self.partial_data / FileLib._pow2[self.remaining_bits - 32]) % 4294967296
    if self.remaining_bits > 32 then
        self.remaining_bits = self.remaining_bits - 32
        self.partial_data = self.partial_data % FileLib._pow2[self.remaining_bits]
    else
        // must be == 32...
        self.remaining_bits = 0
        self.partial_data = 0
    end if
    return ret
end function
    
