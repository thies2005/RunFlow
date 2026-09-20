package com.runflow2.app.core.text

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MarkdownParserTest {

    @Test
    fun `headings paragraphs and inline emphasis`() {
        val blocks = MarkdownParser.parse("## Week 10 overview\n\nYou are **peaking** — keep it *steady*.")
        assertEquals(2, blocks.size)
        val heading = blocks[0] as MdBlock.Heading
        assertEquals(2, heading.level)
        assertEquals(1, heading.spans.size)
        assertEquals("Week 10 overview", (heading.spans[0] as MdSpan.Plain).text)

        val para = blocks[1] as MdBlock.Paragraph
        assertEquals(
            listOf(MdSpan.Plain("You are "), MdSpan.Bold("peaking"), MdSpan.Plain(" — keep it "), MdSpan.Italic("steady"), MdSpan.Plain(".")),
            para.spans,
        )
    }

    @Test
    fun `bullet and ordered lists group consecutive items`() {
        val blocks = MarkdownParser.parse("- Easy 5k\n- Strides 4x100m\n\n1. Swim\n2. Bike")
        assertEquals(2, blocks.size)
        val bullets = blocks[0] as MdBlock.BulletList
        assertEquals(2, bullets.items.size)
        val ordered = blocks[1] as MdBlock.OrderedList
        assertEquals(2, ordered.items.size)
    }

    @Test
    fun `fenced code block keeps lines verbatim`() {
        val blocks = MarkdownParser.parse("```\n6x800m @ 3:12\nrest 90s\n```")
        val code = blocks[0] as MdBlock.CodeBlock
        assertEquals(listOf("6x800m @ 3:12", "rest 90s"), code.lines)
    }

    @Test
    fun `inline code and links`() {
        val spans = MarkdownParser.inline("run at `5:00/km` see [plans](https://runflow.app/plans)")
        assertEquals(
            listOf(
                MdSpan.Plain("run at "),
                MdSpan.Code("5:00/km"),
                MdSpan.Plain(" see "),
                MdSpan.Link("plans", "https://runflow.app/plans"),
            ),
            spans,
        )
    }

    @Test
    fun `pipe table splits header separator and rows`() {
        val blocks = MarkdownParser.parse("| Day | Session |\n|---|---|\n| Mon | Intervals |")
        val table = blocks[0] as MdBlock.Table
        assertEquals(2, table.header.size)
        assertEquals("Day", (table.header[0][0] as MdSpan.Plain).text)
        assertEquals(1, table.rows.size)
        assertEquals("Intervals", (table.rows[0][1][0] as MdSpan.Plain).text)
    }

    @Test
    fun `snake_case identifiers are not italicised`() {
        val spans = MarkdownParser.inline("file_name stays flat")
        assertTrue(spans.all { it is MdSpan.Plain })
    }

    @Test
    fun `unmatched markers degrade to plain text`() {
        val spans = MarkdownParser.inline("a * b and **c")
        assertEquals(listOf(MdSpan.Plain("a * b and **c")), spans)
    }

    @Test
    fun `block quote joins wrapped lines`() {
        val blocks = MarkdownParser.parse("> first line\n> second line")
        val quote = blocks[0] as MdBlock.Quote
        assertEquals("first line second line", (quote.spans[0] as MdSpan.Plain).text)
    }

    @Test
    fun `latex section headers become markdown headings`() {
        // Cached server feedback can carry \section*{…} from LaTeX-leaning
        // models; it must render as a heading, not raw artifacts.
        val blocks = MarkdownParser.parse(
            "\\section*{Planned Comparison}\nOn target.\n\\subsection{Details}\nFine print.",
        )
        val h1 = blocks[0] as MdBlock.Heading
        assertEquals(1, h1.level)
        assertEquals("Planned Comparison", (h1.spans[0] as MdSpan.Plain).text)
        val h2 = blocks[2] as MdBlock.Heading
        assertEquals(2, h2.level)
        assertEquals("Details", (h2.spans[0] as MdSpan.Plain).text)
    }

    @Test
    fun `latex-looking prose lines stay untouched`() {
        val blocks = MarkdownParser.parse("weird \\section in a sentence")
        assertTrue(blocks.all { it is MdBlock.Paragraph })
    }
}
