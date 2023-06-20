// Functionality to read from the pages.

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}
ContextLib = globals.ContextLib

// Send() send a record to a page in the context.
ContextLib.Send = function(context, page, record)
    if context != null and page != null and record != null and context isa map and page isa string and record isa map and context.hasIndex("Pages") then
        if not context.Pages.hasIndex(page) then
            context.Pages[page] = [record]
        else if context.Pages[page] isa list then
            context.Pages[page].push(record)
        end if
        if not context.PagesMeta.hasIndex(page) then
            // Force all the record's keys values to be defined and visible.
            fields = {}
            idx = 0
            for name in record.indexes
                fields[name] = {"Order": idx}
                idx = idx + 1
            end for
            context.PagesMeta[page] = {"Description": "(not set)", "Fields": fields}
        end if
    end if
end function
