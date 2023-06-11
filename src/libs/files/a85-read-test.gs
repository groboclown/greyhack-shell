import_code("binaryRead.gs")
import_code("a85Read.gs")
import_code("../errors.gs")
import_code("../tests.gs")


TestA85NextUInt8 = function(t)
    // Encoded 11, 12, 13, 0, 0, 0, 0, 0, 255
    reader = FileLib.A85Reader.New("$OdIEzrr")

    t.AssertTrue(reader.HasMore, "more 0")
    t.AssertEqual(reader.NextUInt8, 11, "0")
    t.AssertTrue(reader.HasMore, "more 1")
    t.AssertEqual(reader.NextUInt8, 12, "1")
    t.AssertTrue(reader.HasMore, "more 2")
    t.AssertEqual(reader.NextUInt8, 13, "2")
    t.AssertTrue(reader.HasMore, "more 3")
    t.AssertEqual(reader.NextUInt8, 0, "3")
    t.AssertTrue(reader.HasMore, "more 4")
    t.AssertEqual(reader.NextUInt8, 0, "4")
    t.AssertTrue(reader.HasMore, "more 5")
    t.AssertEqual(reader.NextUInt8, 0, "5")
    t.AssertTrue(reader.HasMore, "more 6")
    t.AssertEqual(reader.NextUInt8, 0, "6")
    t.AssertTrue(reader.HasMore, "more 7")
    t.AssertEqual(reader.NextUInt8, 0, "7")
    t.AssertTrue(reader.HasMore, "more 8")
    t.AssertEqual(reader.NextUInt8, 255, "8")
    t.AssertNull(reader.NextUInt8)
    t.AssertFalse(reader.HasMore, "more 10")
end function

if locals == globals then T.RunTests
