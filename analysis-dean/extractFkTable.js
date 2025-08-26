#!/usr/bin/env node
const input = `ALTER TABLE [dbo].[ProcessInfo] CHECK CONSTRAINT [FK_ProcessInfo_PartnerCode_PartnerCode]
GO
ALTER TABLE [dbo].[ProviderPartnerMap]  WITH CHECK ADD  CONSTRAINT [FK_ProviderPartnerMap_PartnerCode_PartnerCode] FOREIGN KEY([PartnerCode])
REFERENCES [dbo].[PartnerCode] ([PartnerCode])
GO
ALTER TABLE [dbo].[ProviderPartnerMap] CHECK CONSTRAINT [FK_ProviderPartnerMap_PartnerCode_PartnerCode]
GO`;

// Revised regex explanation:
// - Matches "ALTER TABLE" followed by optional whitespace.
// - Matches "[dbo].[" with optional spaces before/after dbo.
// - Captures in group "fk_table" any characters until the closing "]".
// - Then non-greedily matches any text until the keyword CONSTRAINT.
// - Then it matches the CONSTRAINT clause, FOREIGN KEY clause and the REFERENCES clause.
//   It captures the constraint name, foreign key and reference table/column using named groups.
// The regex uses the flags "i" for case-insensitive and "s" so that dot (.) matches newline characters.
const regex = /ALTER\s+TABLE\s+\[\s*dbo\s*\]\.\[\s*(?<fk_table>[^\]]+)\s*\].*?CONSTRAINT\s+\[\s*(?<constraint>[^\]]+)\s*\]\s+FOREIGN\s+KEY\s*\(\s*\[\s*(?<fk_key>[^\]]+)\s*\]\s*\)\s+REFERENCES\s+\[\s*dbo\s*\]\.\[\s*(?<ref_table>[^\]]+)\s*\]\s*\(\s*\[\s*(?<ref_column>[^\]]+)\s*\]\s*\)/is;

const match = input.match(regex);
if (match && match.groups) {
    console.log("Matched Table:", match.groups.fk_table);
    console.log("Constraint:", match.groups.constraint);
    console.log("Foreign Key:", match.groups.fk_key);
    console.log("References Table:", match.groups.ref_table);
    console.log("References Column:", match.groups.ref_column);
} else {
    console.log("No match found");
}
