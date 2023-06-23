// Draws the user interface.

// requires:
// import_code("../../libs/context/pages-read.gs")
// import_code("../../libs/context/logs.gs")
// import_code("../../libs/format/formatted-str.gs")
// import_code("../../libs/std-lib/sort.gs")
// import_code("../../libs/context/console.gs")

UI = {}

UI.New = function()
    ret = new UI
    ret.ErrorHeight = 4
    // There's N lines for the prompt context and 1 line for the prompt itself.
    // page height is Height - 1 - PromptContext lines - ErrorHeight
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
                "Style": { "c": "#808080", "b": true },
            },
        },
    }
    ret.ColSep = { "t": "  " }
    ret.LineSep = { "t": "=", "c": "#202040" }
    ret.SepHeadStyle = { "c": "#202060" }
    ret.SepCountStyle = { "c": "#203060" }
    ret.DefaultFieldStyle = { "c": "#808080" }

    ret.PageActiveStyle = { "bg": "#20300040", "c": "#a0a0a0" }
    ret.PageSuffixStyle = { "c": "#101060" }
    ret.PageInactiveStyle = { "bg": "#10102038", "c": "#20d0d0" }
    ret.PageScrollStyle = { "bg": "#10102038", "c": "#404000" }

    ret.SessionActiveStyle = { "bg": "#20300040", "c": "#a0a0a0" }
    ret.SessionSuffixStyle = { "c": "#101060" }
    ret.SessionInactiveStyle = { "bg": "#10102038", "c": "#20d0d0" }
    ret.SessionScrollStyle = { "bg": "#10102038", "c": "#404000" }

    return ret
end function

// LoadConfig() Load the configuration from a JSON section.
UI.LoadConfig = function(section)
    ContextLib.Console.Width = section.Int("width", ContextLib.Console.Width)
    ContextLib.Console.Height = section.Int("height", ContextLib.Console.Height)
    self.ErrorHeight = section.Int("error-height", self.ErrorHeight)
    self.ColSep = section.StyledTextMap("column-separator", self.ColSep)
    self.LineSep = section.StyledTextMap("line-separator-char", self.LineSep)
    self.SepHeadStyle = section.StyleMap("line-separator-header-style", self.SepHeadStyle)
    self.SepCountStyle = section.StyleMap("line-separator-count-style", self.SepCountStyle)
    self.DefaultFieldStyle = section.StyleMap("default-field-style", self.DefaultFieldStyle)

    self.PageActiveStyle   = section.StyleMap("page-active-style",   self.PageActiveStyle)
    self.PageSuffixStyle   = section.StyleMap("page-suffix-style",   self.PageSuffixStyle)
    self.PageInactiveStyle = section.StyleMap("page-inactive-style", self.PageInactiveStyle)
    self.PageScrollStyle   = section.StyleMap("page-scroll-style",   self.PageScrollStyle)

    self.SessionActiveStyle   = section.StyleMap("session-active-style",   self.SessionActiveStyle)
    self.SessionSuffixStyle   = section.StyleMap("session-suffix-style",   self.SessionSuffixStyle)
    self.SessionInactiveStyle = section.StyleMap("session-inactive-style", self.SessionInactiveStyle)
    self.SessionScrollStyle   = section.StyleMap("session-scroll-style",   self.SessionScrollStyle)
end function

// Draw() Returns two strings, the whole screen, and the prompt.
UI.Draw = function(context, session)
    // Get the prompt first, so we know how many lines to reserve at the bottom.
    promptLines = self._draw_prompt(session)
    errors = self._draw_errors(context)
    page = self._draw_page(context, ContextLib.Console.Height - promptLines.len - errors.len - 2)
    prompt = promptLines[-1]
    // TODO should include possible line number position (current / total)
    screen = (
        [self._draw_page_nav(context)] +
        page +
        [self._draw_separator("Errors", context.Errors.len - self.ErrorEnd, context.Errors.len)] +
        errors +
        [self._draw_session_nav(context)] +
        promptLines[:-1])
    return [screen, prompt]
end function

UI._draw_page_nav = function(context)
    ap = context.ActivePage
    apRowCount = context.Pages[ap].len
    apTail = context.PagesMeta[ap].PagesEnd
    suffix = "(" + apTail + " / " + apRowCount + ")"
    return self._draw_nav({
        "activeName": ap, "activeSuffix": suffix,
        "nameOrder": context.PagesOrder,
        "activeStyle": self.PageActiveStyle, "activeSuffixStyle": self.PageSuffixStyle,
        "inactiveStyle": self.PageInactiveStyle,
        "scrollStyle": self.PageScrollStyle,
    })
end function

UI._draw_session_nav = function(context)
    return self._draw_nav({
        "activeName": context.CurrentSessionName, "activeSuffix": "",
        "nameOrder": context.NamedSessionsOrder,
        "activeStyle": self.SessionActiveStyle, "activeSuffixStyle": self.SessionSuffixStyle,
        "inactiveStyle": self.SessionInactiveStyle,
        "scrollStyle": self.SessionScrollStyle,
    })
end function

UI._draw_nav = function(setup)
    activeName = setup.activeName
    activeSuffix = setup.activeSuffix
    nameOrder = setup.nameOrder
    activeStyle = setup.activeStyle
    activeSuffixStyle = setup.activeSuffixStyle
    inactiveStyle = setup.inactiveStyle
    scrollStyle = setup.scrollStyle

    // Create cells that will be drawn to the console.
    // One cell per item.
    cells = []
    cellsLen = []
    cellsLenTotal = 0
    activeIndex = 0
    activeSuffixIndex = 0
    for idx in nameOrder.indexes
        name = nameOrder[idx]
        if name == activeName then
            s1 = " [" + idx + "] " + name + " "
            activeIndex = cells.len
            cellsLen.push(s1.len)
            cellsLenTotal = cellsLenTotal + s1.len
            cells.push(ContextLib.Console.ApplyStyle(s1, activeStyle))

            activeSuffixIndex = cells.len
            cellsLen.push(activeSuffix.len + 1)
            cellsLenTotal = cellsLenTotal + activeSuffix.len + 1
            cells.push(ContextLib.Console.ApplyStyle(activeSuffix + " ", activeSuffixStyle))
        else
            s1 = " (" + idx + ") " + name + " "
            cellsLen.push(s1.len)
            cellsLenTotal = cellsLenTotal + s1.len
            cells.push(ContextLib.Console.ApplyStyle(s1, inactiveStyle))
        end if
    end for

    // We now have the full page status bar.  However, it may be too long.
    while cellsLenTotal > ContextLib.Console.Width
        if activeIndex > 0 then
            cellsLenTotal = cellsLenTotal - cellsLen[0]
            cells.pull()
            cellsLen.pull()
        else if activeSuffixIndex + 1 < cells.len then
            cellsLenTotal = cellsLenTotal - cellsLen[cellsLen.len - 1]
            cells.pop()
            cellsLen.pop()
        else
            // There's only one item, and it's too long.  Just deal with it.
            break
        end if
    end while
    // Split it into lines, and return the top line.
    lines = ContextLib.Console.SplitStyledLines(cells)
    return lines[0]
end function

UI._draw_separator = function(header, counterStart = null, counterTotal = null)
    cells = [ContextLib.Console.ApplyStyle(header, self.SepHeadStyle)]
    total = cells[0].t.len
    if counterStart != null and counterTotal != null then
        cs = str(counterStart)
        ct = str(counterTotal)
        cells.push(ContextLib.Console.ApplyStyle("(" + cs + " / " + ct + ") ", self.SepCountStyle))
        total = total + cells[1].t.len
    end if

    lineSepLen = 0
    if self.LineSep isa map then lineSepLen = self.LineSep.t.len
    if self.LineSep isa string then lineSepLen = self.LineSep.len
    while total < ContextLib.Console.Width
        cells.push(self.LineSep)
        total = total + lineSepLen
    end while
    // Split it into lines, and return the top line.
    lines = ContextLib.Console.SplitStyledLines(cells)
    return lines[0]
end function

UI._draw_prompt = function(session)
    // This uses the ENV prompt.
    ret = []

    if session.Env.hasIndex("PROMPT") then
        vars = {} + session.Env + session
        // To be accurate, this should include limiting the prompt to the Width.
        // Doing so, though, requires re-parsing the styling, which we're just not going to do.
        for line in ContextLib.Console.SplitLineFeeds(session.Env.PROMPT)
            ret.push(FormatStr.PyFormat(line, vars))
        end for
    end if
    if ret.len <= 0 then
        // Add the default prompt.
        // Example of one: "PROMPT": "[{User}@{Ip} {CwdN}]$ "
        ret.push("$ ")
    end if
    return ret
end function

UI._draw_errors = function(context)
    return self._draw_row_set(
        context.Errors,
        self.ErrorMetadata,
        self.ErrorHeight,
        self.ErrorEnd)
end function

UI._draw_page = function(context, rowCount)
    if not context.PagesMeta[context.ActivePage].hasIndex("PagesEnd") then
        context.PagesMeta[context.ActivePage].PagesEnd = 0
    end if
    return self._draw_row_set(
        context.Pages[context.ActivePage],
        context.PagesMeta[context.ActivePage],
        rowCount,
        context.PagesMeta[context.ActivePage].PagesEnd)
end function

UI._draw_row_set = function(rows, metadata, rowCount, fromEnd)
    if not metadata.hasIndex("_cached_fields") then
        metadata._cached_fields = self._get_ordered_fields(metadata.Fields)
    end if
    // In case the console width changed
    ContextLib.Console.ComputeColumnWidth(metadata._cached_fields, self.ColSep.t)

    rowLen = rows.len
    endRow = rowLen - fromEnd
    if endRow < rowCount then endRow = rowCount
    idx = endRow - rowCount

    ret = []
    while idx < rowLen and idx < endRow
        ret.push(self._draw_row(rows[idx], metadata._cached_fields))
        idx = idx + 1
    end while
    while ret.len < rowCount
        ret.push("")
    end while
    return ret
end function

UI._draw_row = function(row, orderedFields)
    cells = []
    first = true
    for field in orderedFields
        if first then
            first = false
        else
            cells.push(self.ColSep)
        end if
        style = @field.Style
        if @style isa funcRef then
            style = style(row)
        end if

        val = "()"
        key = field.Name
        if row.hasIndex(key) then
            val = row[key]
        end if
        if field.hasIndex("Text") then
            // This line seems buggy.
            textf = @field.Text
            if @textf isa funcRef then
                val = textf(val)
            end if
        end if
        if not val isa string then
            val = FormatStr._as_str(val)
        end if
        // Could have left/right justified, but it's just left right now.
        while val.len < field.ComputedWidth
            val = val + " "
        end while
        val = val[:field.ComputedWidth]

        cells.push(ContextLib.Console.ApplyStyle(val, style))
    end for
    // Split it into lines, and return the top line.
    lines = ContextLib.Console.SplitStyledLines(cells)
    return lines[0]
end function

// _get_ordered_fields() Get the visible, ordered field metadata.
UI._get_ordered_fields = function(fieldMetadata)
    // Needs a sort implementation.
    // Instead, we'll just assume that people know what they're doing.
    ret = []
    for key in fieldMetadata.indexes
        field = fieldMetadata[key]
        if field.hasIndex("Order") then
            style = self.DefaultFieldStyle
            if field.hasIndex("Style") then style = @field.Style
            text = null
            if field.hasIndex("Text") then text = @field.Text
            width = null
            // Only supporting fixed-width columns.  Pecent based column
            // width would be fun.
            if field.hasIndex("Width") and field.Width isa number then
                width = field.Width
            end if
            value = {"Name": key, "Style": @style, "Text": @text, "Width": width, "Order": field.Order}
            ret.push(value)
        end if
    end for
    StdLib.QuickSort(ret, @UI._field_sorter)
    return ret
end function

UI._field_sorter = function(a, b)
    return a.Order - b.Order
end function
