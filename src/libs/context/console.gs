// Console / Terminal simulation tools.

// Dependencies:
// import_code("get.gs")
// import_code("../format/formatted-str.gs")

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}
ContextLib = globals.ContextLib

ContextLib.Console = {
    "Width": 80,
    "Height": 20,
    // End-of-line split characters.  Ignores Windows and old Mac \r.
    // It's a regex, so '\' must be escaped.
    "_regex_linesplit": "\\n|" + char(10),
    "_style_idx": ["c", "bg", "u", "s", "b", "i"],
}

// SplitStyledLines() Split the text into multiple, styled lines based on console width.
//
// There are a lot of potential fancy character things:
// http://digitalnativestudios.com/textmeshpro/docs/rich-text/
// However, very few of them do useful stuff.
//
// The text in this call can be "rich text", which, in this context,
// is a list of strings and maps.  Strings are converted as-is, and
// maps are text with display options.
//
// Specially handled text:
//   \n - a forced line separator.
// Format maps:
//   t - the display text.
//   c - the text color, in #rrggbb or #rrggbbaa format
//   bg - overlay color, in #rrggbbaa format.  Should have an alpha.
//   u - underline, set to either true or false.
//   s - strikethrough, set to either true or false.
//   b - bold, set to either true or false.
//   i - italics, set to either true or false.
ContextLib.Console.SplitStyledLines = function(text, consoleWidth=null)
    if consoleWidth == null then consoleWidth = self.Width
    if text isa string then text = [text]
    if not text isa list or consoleWidth <= 0 then return []
    lines = []
    buffer = ""
    count = 0
    for bit in text
        prefix = ""
        suffix = ""
        if bit isa map and bit.hasIndex("t") then
            if bit.hasIndex("c") and bit.c isa string then
                prefix = prefix + "<color=" + bit.c + ">"
                suffix = "</color>" + suffix
            end if
            if bit.hasIndex("bg") and bit.bg isa string then
                prefix = prefix + "<mark=" + bit.bg + ">"
                suffix = "</mark>" + suffix
            end if
            for style in "usbi"
                if bit.hasIndex(style) and bit[style] then
                    prefix = prefix + "<" + style + ">"
                    suffix = "</" + style + ">" + suffix
                end if
            end for
            bit = bit.t
        end if
        // If the bit is a map but does not have a "t",
        // then there's no text, and there's nothing to display.
        if bit isa string or bit isa number then
            firstLine = true
            for sbit in ContextLib.Console.SplitLineFeeds(str(bit))
                // It would be nice if this also split on words...
                while sbit.len > 0
                    if firstLine then
                        firstLine = false
                    else
                        lines.push(buffer)
                        buffer = ""
                        count = 0
                    end if
                    pos = consoleWidth - count
                    if pos <= 0 then
                        // New line without extra stuff already added.
                        lines.push(buffer)
                        buffer = ""
                        count = 0
                        continue
                    end if
                    if pos > sbit.len then
                        pos = sbit.len
                        rbit = sbit
                        sbit = ""
                    else
                        rbit = sbit[0:pos]
                        sbit = sbit[pos:]
                    end if
                    buffer = buffer + prefix + "<noparse>" + rbit + "</noparse>" + suffix
                    count = count + pos
                end while
            end for
        end if
    end for
    if count > 0 then lines.push(buffer)
    return lines
end function

// ComputeColumnWidth() Computes the width of the list of column maps.
//
// The argument is a list of maps, each of which may contain a 'Width'
// key.  If it has a 'Width' key, then it's used as a numeric hint at the
// amount of screen width to take up by the column.
// If a column does not have a width, it's size is split between the
// remaining width.
//
// This alters the argument's column maps in-place by setting a
// 'ComputedWidth' value to the computed value.  This allows the function to
// run again if the console width changes.  It also sets 'ConsoleWidth' to
// the value to allow quick cache checks.  It also is set with 'ColumnSeparator'
// to indicate the separator to add after the column value.  If ComputedWidth == 0
// or Width == "0", then the column is made not visible.
ContextLib.Console.ComputeColumnWidth = function(columns, columnSeparator, consoleWidth=null)
    if consoleWidth == null then consoleWidth = self.Width
    if not columns isa list or consoleWidth <= 0 then
        print("Console width <= 0 " + consoleWidth + " or columns is not a list " + columns)
        return
    end if
    // Cache check; this also implicitly returns early if there are no columns.
    is_cached = true
    for col in columns
        // Check for valid input first.
        if not col isa map then
            print("ERROR BAD COLUMN")
            return
        end if
        if not col.hasIndex("ComputedWidth") or not col.hasIndex("ConsoleWidth") or col.ConsoleWidth != consoleWidth then
            is_cached = false
            break
        end if
        // Ensure there's a Width value so we don't have to keep running the 'hasIndex' call.
        if not col.hasIndex("Width") then col.Width = null
    end for
    if is_cached then return

    // At this point, the columns all need to be recomputed, and
    // there is at least one column.

    columnSeparatorWidth = columnSeparator.len
    remainingWidth = consoleWidth
    visible = []
    noWidth = []
    for col in columns
        col.ColumnSeparator = columnSeparator
        col.ConsoleWidth = consoleWidth
        if col.Width == null then
            noWidth.push(col)
            visible.push(col)
            // In case there is no remaining width left, fix the
            // width to 0.
            col.ComputedWidth = 0
            // Remove the column separator width from the remainder.
            remainingWidth = remainingWidth - columnSeparatorWidth
        else if col.Width isa number and col.Width > 0 then
            // fixed width value
            col.ComputedWidth = floor(col.Width)
            visible.push(col)
            remainingWidth = remainingWidth - columnSeparatorWidth - col.ComputedWidth
        // Could do a string as a variable width + explicit not-visible.
        // else if col.Width == "0" then
        else
            // Hard-coded to not show up.
            col.ComputedWidth = 0
            col.ColumnSeparator = ""
        end if
    end for
    // If there's nothing visible, then exit early.
    if visible.len <= 0 then return
    // Every visible column is assigned a column separator to
    // appear after it.  However, the last one must not have one.
    visible[visible.len - 1].ColumnSeparator = ""
    remainingWidth = remainingWidth + columnSeparatorWidth

    // Calculate column width for those with no specified width.
    // This is done by splitting the remaining width between the
    // columns with no width.  The "remainingWidth" already has
    // the column separator width removed, so it's only containing
    // the width to split between the columns.  The final no-width
    // column will be given the rounding error remainder.
    // If there is remaining width and no columns with no fixed
    // width, then the remainder is NOT spread into the fixed width
    // columns.  Likewise, if the fixed width columns take up more
    // than the full width, the fixed widths are not changed.
    if remainingWidth > 0 and noWidth.len > 0 then
        perCol = floor(remainingWidth / noWidth.len)
        for col in noWidth
            col.ComputedWidth = perCol
            remainingWidth = remainingWidth - perCol
        end for
        // put the rounding error into the last no-width column.
        noWidth[noWidth.len - 1].ComputedWidth = perCol + remainingWidth
    end if
end function

// ApplyStyle() Creates a new style map with the given text.
ContextLib.Console.ApplyStyle = function(text, style)
    ret = { "t": text }
    for key in self._style_idx
        if style.hasIndex(key) then ret[key] = style[key]
    end for
    return ret
end function

// PullStyle() Extracts text from the data and applies it to the style.
//
// The style can have an attribute be a function, in which case the
// attribute is called with the whole data as an argument.
// The style can also be a function, in which case it's called with the
// row and returns a style object.
ContextLib.Console.PullStyle = function(data, textKey, style)
    if @style isa funcRef then style = style(data)
    text = ""
    if data isa map and data.hasIndex(textKey) then text = @data[textKey]
    if not style isa map then return text
    ret = { "t": text }
    for key in self._style_idx
        if style.hasIndex(key) then
            val = @style[key]
            if @val isa funcRef then val = val(row)
            ret[key] = val
        end if
    end for
    return ret
end function

// SplitLineFeeds() Splits text into multiple lines based on \n and char(10).
// Designed mostly around users passing in explicit "\n" text to turn into
// line feeds.
ContextLib.Console.SplitLineFeeds = function(text)
    return text.split(self._regex_linesplit)
end function
