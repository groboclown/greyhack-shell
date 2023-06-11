import_code("binaryRead.gs")
import_code("../errors.gs")
import_code("../tests.gs")

// Reads 0 or 1 from a string.
bit_reader = function()
    if self.read_pos >= self.content.len then return 0
    value = self.content[self.read_pos]
    self.read_pos = self.read_pos + 1
    if value == "1" then
        self.buffer.push(1)
        return 1
    else if value == "0" then
        self.buffer.push(0)
        return 1
    end if
    return 0
end function


TestOneBitReaderNextBit = function(t)
    reader = FileLib.BinaryReader.New("1011")
    reader.buffer_bit_size = 1
    reader.load_buffer = @bit_reader

    t.AssertTrue(reader.HasMore, "more 1")
    t.AssertEqual(reader.NextBit, 1)
    t.AssertTrue(reader.HasMore, "more 2")
    t.AssertEqual(reader.NextBit, 0)
    t.AssertTrue(reader.HasMore, "more 3")
    t.AssertEqual(reader.NextBit, 1)
    t.AssertTrue(reader.HasMore, "more 4")
    t.AssertEqual(reader.NextBit, 1)
    t.AssertFalse(reader.HasMore, "more 5")
    t.AssertNull(reader.NextBit)
    t.AssertFalse(reader.HasMore, "more 6")
end function

TestOneBitReaderNextUInt8 = function(t)
    reader = FileLib.BinaryReader.New("11001100")
    reader.buffer_bit_size = 1
    reader.load_buffer = @bit_reader

    t.AssertTrue(reader.HasMore)
    t.AssertEqual(reader.NextUInt8, 204)
    t.AssertFalse(reader.HasMore)
    t.AssertNull(reader.NextUInt8)
end function

TestOneBitReaderNextSInt8 = function(t)
    reader = FileLib.BinaryReader.New("11001100")
    reader.buffer_bit_size = 1
    reader.load_buffer = @bit_reader

    t.AssertTrue(reader.HasMore)
    t.AssertEqual(reader.NextSInt8, -52)
    t.AssertFalse(reader.HasMore)
    t.AssertNull(reader.NextSInt8)
end function

TestOneBitReaderMixed = function(t)
    // 9 bits.
    reader = FileLib.BinaryReader.New("110011000")
    reader.buffer_bit_size = 1
    reader.load_buffer = @bit_reader

    t.AssertTrue(reader.HasMore)
    t.AssertEqual(reader.NextUInt8, 204)
    t.AssertTrue(reader.HasMore)
    t.AssertNull(reader.NextSInt8)
    t.AssertTrue(reader.HasMore)
    t.AssertEqual(reader.NextBit, 0)
    t.AssertFalse(reader.HasMore)
end function

if locals == globals then T.RunTests
