#!/usr/bin/env node
const input = `ALTER TABLE [dbo].[ProcessInfo] CHECK CONSTRAINT [FK_ProcessInfo_PartnerCode_PartnerCode]
GO
ALTER TABLE [dbo].[ProviderPartnerMap]  WITH CHECK ADD  CONSTRAINT [FK_ProviderPartnerMap_PartnerCode_PartnerCode] FOREIGN KEY([PartnerCode])
REFERENCES [dbo].[PartnerCode] ([PartnerCode])
GO
ALTER TABLE [dbo].[ProviderPartnerMap] CHECK CONSTRAINT [FK_ProviderPartnerMap_PartnerCode_PartnerCode]
GO`;

// Revised regex explanation:
// The regex now explicitly requires that after the table name there is "WITH CHECK ADD".
// It then matches the CONSTRAINT clause, FOREIGN KEY clause and the REFERENCES clause.
// This prevents the regex from matching the first ALTER TABLE statement, ensuring that 
// only the statement for ProviderPartnerMap is captured.
// The regex uses the flags "i" for case-insensitive and "s" so that dot (.) matches newline characters.
const regex = /ALTER\s+TABLE\s+\[\s*dbo\s*\]\.\[\s*(?<fk_table>[^\]]+)\s*\]\s+WITH\s+CHECK\s+ADD\s+CONSTRAINT\s+\[\s*(?<constraint>[^\]]+)\s*\]\s+FOREIGN\s+KEY\s*\(\s*\[\s*(?<fk_key>[^\]]+)\s*\]\s*\)\s+REFERENCES\s+\[\s*dbo\s*\]\.\[\s*(?<ref_table>[^\]]+)\s*\]\s*\(\s*\[\s*(?<ref_column>[^\]]+)\s*\]\s*\)/is;

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
