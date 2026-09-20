package com.runflow2.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.runflow2.app.core.text.MarkdownParser
import com.runflow2.app.core.text.MdBlock
import com.runflow2.app.core.text.MdSpan

/**
 * Renders a markdown message (AI-coach replies) as styled Compose text:
 * headings, lists, quotes, code fences, pipe tables and inline emphasis.
 * Falls back to the plain message if parsing yields nothing.
 */
@Composable
fun MarkdownText(
    markdown: String,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.onSurfaceVariant,
) {
    val blocks = remember(markdown) { MarkdownParser.parse(markdown) }
    if (blocks.isEmpty()) {
        Text(markdown, modifier, style = MaterialTheme.typography.bodyMedium, color = color)
        return
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        blocks.forEach { block ->
            when (block) {
                is MdBlock.Heading -> Text(
                    inlineAnnotated(block.spans, color),
                    style = when (block.level) {
                        1 -> MaterialTheme.typography.titleLarge
                        2 -> MaterialTheme.typography.titleMedium
                        else -> MaterialTheme.typography.titleSmall
                    },
                    fontWeight = FontWeight.SemiBold,
                    color = color,
                )

                is MdBlock.Paragraph -> Text(
                    inlineAnnotated(block.spans, color),
                    style = MaterialTheme.typography.bodyMedium,
                    color = color,
                )

                is MdBlock.Quote -> Row {
                    Spacer(
                        Modifier
                            .width(3.dp)
                            .height(20.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(color.copy(alpha = 0.4f)),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        inlineAnnotated(block.spans, color),
                        style = MaterialTheme.typography.bodyMedium,
                        fontStyle = FontStyle.Italic,
                        color = color.copy(alpha = 0.85f),
                    )
                }

                is MdBlock.BulletList -> block.items.forEach { item ->
                    Row {
                        Text("•  ", style = MaterialTheme.typography.bodyMedium, color = color)
                        Text(
                            inlineAnnotated(item, color),
                            style = MaterialTheme.typography.bodyMedium,
                            color = color,
                        )
                    }
                }

                is MdBlock.OrderedList -> block.items.forEachIndexed { index, item ->
                    Row {
                        Text("${index + 1}.  ", style = MaterialTheme.typography.bodyMedium, color = color)
                        Text(
                            inlineAnnotated(item, color),
                            style = MaterialTheme.typography.bodyMedium,
                            color = color,
                        )
                    }
                }

                is MdBlock.CodeBlock -> Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(color.copy(alpha = 0.08f))
                        .padding(10.dp)
                        .horizontalScroll(rememberScrollState()),
                ) {
                    block.lines.forEach { line ->
                        Text(
                            line.ifEmpty { " " },
                            fontFamily = FontFamily.Monospace,
                            style = MaterialTheme.typography.bodySmall,
                            color = color,
                        )
                    }
                }

                is MdBlock.Table -> Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(color.copy(alpha = 0.08f))
                        .padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    if (block.header.isNotEmpty()) {
                        Row {
                            block.header.forEach { cell ->
                                Text(
                                    inlineAnnotated(cell, color),
                                    Modifier.weight(1f),
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = color,
                                )
                            }
                        }
                    }
                    block.rows.forEach { row ->
                        Row {
                            row.forEach { cell ->
                                Text(
                                    inlineAnnotated(cell, color),
                                    Modifier.weight(1f),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = color,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun inlineAnnotated(spans: List<MdSpan>, base: Color): androidx.compose.ui.text.AnnotatedString {
    // read composables outside the buildAnnotatedString lambda (not composable)
    val linkColor = MaterialTheme.colorScheme.primary
    return buildAnnotatedString {
        for (span in spans) {
            when (span) {
                is MdSpan.Plain -> append(span.text)
                is MdSpan.Bold -> withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(span.text) }
                is MdSpan.Italic -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(span.text) }
                is MdSpan.BoldItalic -> withStyle(
                    SpanStyle(fontWeight = FontWeight.Bold, fontStyle = FontStyle.Italic),
                ) { append(span.text) }
                is MdSpan.Code -> withStyle(
                    SpanStyle(fontFamily = FontFamily.Monospace, background = base.copy(alpha = 0.12f)),
                ) { append(span.text) }
                is MdSpan.Strike -> withStyle(SpanStyle(textDecoration = TextDecoration.LineThrough)) { append(span.text) }
                is MdSpan.Link -> withStyle(SpanStyle(color = linkColor)) { append(span.text) }
            }
        }
    }
}
