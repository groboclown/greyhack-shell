// Draws the user interface.

// requires:
// import_code("../../libs/context/pages-read.gs")
// import_code("../../libs/context/logs.gs")
// import_code("../../libs/format/formatted-str.gs")

UI = {}

UI.New = function()
    ret = new UI
    ret.Width = 80
    ret.Height = 30
    ret.ErrorHeight = 4
    // There's N lines for the prompt context and 1 line for the prompt itself.
    // page height is Height - 1 - PromptContext lines - ErrorHeight
    ret.PageStart = 0
    ret.ErrorEnd = 0
    ret.ErrorMetadata = {
        "Default": "Text",
        "Fields": {
            "Msg": {
                "Description": "Raw message",
            },
            "Params": {
                "Description": "Raw parameters",
            },
            "Text": {
                "Description": "Human readable error message",
                "Order": 1,
                "Color": "#808080",
            },
        },
    }
    ret.ColSep = "  "
    ret.LineSep = "="
    ret.SepColor = "#101040"
    return ret
end function

UI.LoadConfig = function(section)
    self.Width = section.Int("width", self.Width)
    self.Height = section.Int("height", self.Height)
    self.ErrorHeight = section.Int("error-height", self.ErrorHeight)
    self.ColSep = section.Str("column-separator", self.ColSep)
    self.LineSep = section.Str("line-separator-char", self.LineSep)
end function

// Draw() Returns two strings, the whole screen, and the prompt.
UI.Draw = function(context, session)
    // Get the prompt first, so we know how many lines to reserve at the bottom.
    promptLines = self._draw_prompt(session)
    errors = self._draw_errors(context)
    page = self._draw_page(context, self.Height - promptLines.len - errors.len - 2)
    prompt = promptLines[-1]
    sep = [self._draw_separator()]
    screen = page + sep + errors + sep + promptLines[:-1]
    return [screen, prompt]
end function

UI._draw_separator = function()
    ret = "<color=" + self.SepColor + ">"
    while ret.len < self.Width
        ret = ret + self.LineSep
    end while
    return ret + "</color>"
end function

UI._draw_prompt = function(session)
    ret = []
    if session.env.hasIndex("PROMPT") then
        params = {} + session.env + session
        // To be accurate, this should include limiting the prompt to the Width.
        for line in self._split_lines(session.env.PROMPT)
            ret.push(FormatStr.PyFormat(line, params))
        end for
    end if
    if ret.len <= 0 then
        // Add the default prompt.
        // Example of one: "PROMPT": "[{user}@{ip} {cwdn}]$ "
        ret.push("$ ")
    end if
    return ret
end function

UI._draw_errors = function(context)
    tail = context.Errors.len - self.ErrorEnd
    start = tail - self.ErrorHeight
    if start < 0 then
        start = 0
        tail = self.ErrorHeight
        if tail > context.Errors.len then tail = context.Errors.len
    end if
    ret = []
    if start < tail then
        fields = self._get_ordered_fields(self.ErrorMetadata.Fields)

        while start < tail
            ret.push(self._draw_row(context.Errors[start], fields))
            start = start + 1
        end while
    end if
    while ret.len < self.ErrorHeight
        ret.push("")
    end while
    return ret
end function

UI._draw_page = function(context, rowCount)
    ret = []
    rows = ContextLib.Page(context, context.ActivePage, self.PageStart, rowCount)
    if rows != null then
        if context.PagesMeta.hasIndex(context.ActivePage) then
            metadata = context.PagesMeta[context.ActivePage]
            fields = self._get_ordered_fields(metadata.Fields)
            for row in rows
                ret.push(self._draw_row(row, fields))
            end for
        end if
    end if
    while ret.len < rowCount
        ret.push("")
    end while
    return ret
end function

UI._draw_row = function(row, orderedFields)
    ret = ""
    first = true
    col = 0
    for field in orderedFields
        if first then
            first = false
        else
            ret = ret + self.ColSep
            col = col + self.ColSep.len
        end if
        color = @field.Color
        if @color isa funcRef then
            color = color(row)
        end if
        ret = ret + "<color=" + color + ">"
        val = "()"
        if row.hasIndex(field.Name) then val = row[field.Name]
        // if field.hasIndex("Text") then
            // This line seems buggy.
            // val = field.Text(val)
        // else if not val isa string then
        if not val isa string then
            val = FormatStr._as_str(val)
        end if
        p = 0
        while p < val.len and col < self.Width
            ret = ret + val[p]
            p = p + 1
            col = col + 1
        end while
        ret = ret + "</color>"
    end for
    return ret
end function

// _get_ordered_fields() Get the visible, ordered field metadata.
UI._get_ordered_fields = function(fieldMetadata)
    // Needs a sort implementation.
    // Instead, we'll just assume that people know what they're doing.
    ret = []
    pos = 1
    fixedWidths = 0
    needsWidth = []
    while true
        found = false
        for key in fieldMetadata.indexes
            field = fieldMetadata[key]
            if field.hasIndex("Order") then
                // There's no short circuit for 'and'...
                if field.Order != pos then continue
                color = "#808080"
                if field.hasIndex("Color") then color = @field.Color
                text = null
                if field.hasIndex("Text") then text = @field.Text
                width = null
                // Only supporting fixed-width columns.  Pecent based column
                // width would be fun.
                if field.hasIndex("Width") and field.Width isa number then
                    width = field.hasIndex("Width")
                    // This looks like a fence-post error, but we make up this last
                    // column separator by adding it to the final remaining width.
                    fixedWidths = fixedWidths + width + self.ColSep.len
                else
                    needsWidth.push(field)
                end if
                ret.push({"Name": key, "Color": @color, "Text": @text, "Width": width})
                found = true
                break
            end if
        end for
        if not found then break
        pos = pos + 1
    end while

    // Calculate field width.
    // This is done by spreading the remaining width amongst all
    // the needs-width fields.
    remainingWidth = self.Width - fixedWidths
    if needsWidth.len > 0 then
        // Spread the remaining width to the non-width columns.
        perCol = floor(remainingWidth / needsWidth.len) - self.ColSep.len
        lastCol = remainingWidth - (perCol * needsWidth.len - 1) + self.ColSep.len
        for fw in needsWidth
            fw.Width = perCol
        end for
        needsWidth[-1].Width = lastCol
    else if remainingWidth > 0 and ret.len > 0 then
        // Add the remaining width to the last field.
        ret[-1].Width = ret[-1].Width + remainingWidth + self.ColSep.len
    else if ret.len > 0 then
        ret[-1].Width = ret[-1].Width + self.ColSep.len
    end if
    return ret
end function

// _split_lines() Splits text into multiple lines.
//
// Assumes simple Unix line feeds (\n)
UI._split_lines = function(text)
    CR = char(10) // \n
    lines = []
    start = 0
    for pos in text.indexes
        c = text[pos]
        if c == CR then
            lines.push(text[start:pos])
            start = pos + 1
        end if
    end for
    if start < text.len then lines.push(text[start:])
    return lines
end function
