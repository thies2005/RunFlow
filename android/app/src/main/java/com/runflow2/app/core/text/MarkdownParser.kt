package com.runflow2.app.core.text

/**
 * Minimal markdown parser for AI-coach replies — the subset the model
 * actually emits: headings, bullet/numbered lists, fenced code, block
 * quotes, pipe tables and inline bold / italic / code / links.
 *
 * Pure Kotlin (no dependency, no Compose) so it is unit-testable; the
 * renderer lives in ui/components/MarkdownText.kt. Unmatched markers are
 * kept as literal text — a malformed message degrades, never disappears.
 */

/** Inline styled run within a block. Flat model — no nested emphasis. */
sealed class MdSpan {
    abstract val text: String

    data class Plain(override val text: String) : MdSpan()
    data class Bold(override val text: String) : MdSpan()
    data class Italic(override val text: String) : MdSpan()
    data class BoldItalic(override val text: String) : MdSpan()
    data class Code(override val text: String) : MdSpan()
    data class Strike(override val text: String) : MdSpan()
    data class Link(override val text: String, val url: String) : MdSpan()
}

/** Block-level element. */
sealed class MdBlock {
    data class Heading(val level: Int, val spans: List<MdSpan>) : MdBlock()
    data class Paragraph(val spans: List<MdSpan>) : MdBlock()
    data class CodeBlock(val lines: List<String>) : MdBlock()
    data class Quote(val spans: List<MdSpan>) : MdBlock()
    data class BulletList(val items: List<List<MdSpan>>) : MdBlock()
    data class OrderedList(val items: List<List<MdSpan>>) : MdBlock()
    data class Table(val header: List<List<MdSpan>>, val rows: List<List<List<MdSpan>>>) : MdBlock()
}

object MarkdownParser {

    private val bulletRegex = Regex("^\\s*[-*+]\\s+(.*)$")
    private val orderedRegex = Regex("^\\s*(\\d+)[.)]\\s+(.*)$")
    private val headingRegex = Regex("^(#{1,6})\\s+(.*)$")
    private val fenceRegex = Regex("^```\\s*(\\S*)\\s*$")

    // Some feedback models answer with LaTeX section headers instead of the
    // requested markdown ## (\section*{Planned Comparison}) — cached server
    // feedback can still carry them. Line-anchored so prose with a literal
    // backslash-word is left alone.
    private val latexSectionRegex = Regex("""^\s*\\{1,2}((?:sub)*)section\*?\s*\{([^}\n]+)\}\s*$""")

    fun parse(raw: String): List<MdBlock> {
        val blocks = ArrayList<MdBlock>()
        val lines = raw.lines().map { line ->
            val latex = latexSectionRegex.matchEntire(line)
            if (latex != null) {
                val subs = latex.groupValues[1].length / 3 // "sub" repetitions
                "#".repeat((subs + 1).coerceAtMost(6)) + " " + latex.groupValues[2].trim()
            } else line
        }
        var i = 0

        while (i < lines.size) {
            val line = lines[i]

            val fence = fenceRegex.matchEntire(line.trimEnd())
            if (fence != null) {
                val body = ArrayList<String>()
                i++
                while (i < lines.size && !lines[i].trimEnd().startsWith("```")) {
                    body += lines[i]
                    i++
                }
                i++ // skip closing fence (or run past the end of an unterminated block)
                blocks += MdBlock.CodeBlock(body)
                continue
            }

            if (line.isBlank()) {
                i++
                continue
            }

            val heading = headingRegex.matchEntire(line)
            if (heading != null) {
                blocks += MdBlock.Heading(heading.groupValues[1].length, inline(heading.groupValues[2]))
                i++
                continue
            }

            val bullet = bulletRegex.matchEntire(line)
            val ordered = orderedRegex.matchEntire(line)
            if (bullet != null || ordered != null) {
                val items = ArrayList<List<MdSpan>>()
                while (i < lines.size) {
                    val l = lines[i]
                    val b = bulletRegex.matchEntire(l)
                    val o = orderedRegex.matchEntire(l)
                    when {
                        b != null && bullet != null -> items += inline(b.groupValues[1])
                        o != null && ordered != null -> items += inline(o.groupValues[2])
                        else -> break
                    }
                    i++
                }
                blocks += if (bullet != null) MdBlock.BulletList(items) else MdBlock.OrderedList(items)
                continue
            }

            if (line.trimStart().startsWith(">")) {
                val quote = ArrayList<String>()
                while (i < lines.size && lines[i].trimStart().startsWith(">")) {
                    quote += lines[i].trimStart().removePrefix(">").removePrefix(" ")
                    i++
                }
                blocks += MdBlock.Quote(inline(quote.joinToString(" ")))
                continue
            }

            if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
                val tableLines = ArrayList<String>()
                while (i < lines.size && lines[i].trim().startsWith("|")) {
                    tableLines += lines[i].trim()
                    i++
                }
                parseTable(tableLines)?.let { blocks += it }
                continue
            }

            // paragraph: consecutive non-special lines join into one block
            val para = ArrayList<String>()
            while (i < lines.size && lines[i].isNotBlank() &&
                headingRegex.matchEntire(lines[i]) == null &&
                bulletRegex.matchEntire(lines[i]) == null &&
                orderedRegex.matchEntire(lines[i]) == null &&
                !lines[i].trimStart().startsWith(">") &&
                fenceRegex.matchEntire(lines[i].trimEnd()) == null
            ) {
                para += lines[i]
                i++
            }
            blocks += MdBlock.Paragraph(inline(para.joinToString(" ")))
        }

        return blocks
    }

    /** `| a | b |` rows; a `|---|---|` separator divides header from body. */
    private fun parseTable(rows: List<String>): MdBlock.Table? {
        val cells = rows.map { row ->
            row.removePrefix("|").removeSuffix("|").split("|").map { it.trim() }
        }
        val separatorIndex = cells.indexOfFirst { c -> c.isNotEmpty() && c.all { it.all { ch -> ch == '-' || ch == ':' || ch == ' ' } } }
        if (separatorIndex < 0) {
            return MdBlock.Table(emptyList(), cells.map { r -> r.map { inline(it) } })
        }
        val header = cells.subList(0, separatorIndex).flatten().map { inline(it) }
        val body = cells.subList(separatorIndex + 1, cells.size).map { r -> r.map { inline(it) } }
        return MdBlock.Table(header, body)
    }

    // ---- inline ----

    // Group map: 1 code · 3 bold-italic · 5 bold · 7 italic · 8 strike ·
    // 9/10 link text/url. Openers repeat via backreference (\2, \4, \6).
    // `_`-italic is deliberately unsupported: mid-word underscores are far
    // more common in training data (file names, metrics) than _emphasis_.
    private val inlineRegex = Regex(
        """`([^`\n]+)`""" +                                  // `code`
            """|(\*\*\*|___)(?=\S)(.+?)(?<=\S)\2""" +        // ***bold italic***
            """|(\*\*|__)(?=\S)(.+?)(?<=\S)\4""" +           // **bold** / __bold__
            """|(\*)(?=\S)(.+?)(?<=\S)\6""" +                // *italic*
            """|~~(?=\S)(.+?)(?<=\S)~~""" +                  // ~~strike~~
            """|\[([^\]\n]+)]\((https?://[^)\s]+|/[^)\s]*)\)""" // [text](url)
    )

    fun inline(text: String): List<MdSpan> {
        val spans = ArrayList<MdSpan>()
        var cursor = 0
        for (m in inlineRegex.findAll(text)) {
            if (m.range.first > cursor) spans += MdSpan.Plain(text.substring(cursor, m.range.first))
            val g = m.groupValues
            spans += when {
                g[1].isNotEmpty() -> MdSpan.Code(g[1])
                g[3].isNotEmpty() -> MdSpan.BoldItalic(g[3])
                g[5].isNotEmpty() -> MdSpan.Bold(g[5])
                g[7].isNotEmpty() -> MdSpan.Italic(g[7])
                g[8].isNotEmpty() -> MdSpan.Strike(g[8])
                g[9].isNotEmpty() -> MdSpan.Link(g[9], g[10])
                else -> MdSpan.Plain(m.value)
            }
            cursor = m.range.last + 1
        }
        if (cursor < text.length) spans += MdSpan.Plain(text.substring(cursor))
        return spans.ifEmpty { listOf(MdSpan.Plain(text)) }
    }
}
