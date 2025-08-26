#!/usr/bin/env python3
import re

input_text = """ALTER TABLE [dbo].[ProcessInfo] CHECK CONSTRAINT [FK_ProcessInfo_PartnerCode_PartnerCode]
GO
ALTER TABLE [dbo].[ProviderPartnerMap]  WITH CHECK ADD  CONSTRAINT [FK_ProviderPartnerMap_PartnerCode_PartnerCode] FOREIGN KEY([PartnerCode])
REFERENCES [dbo].[PartnerCode] ([PartnerCode])
GO
ALTER TABLE [dbo].[ProviderPartnerMap] CHECK CONSTRAINT [FK_ProviderPartnerMap_PartnerCode_PartnerCode]
GO"""

pattern = r"ALTER\s+TABLE\s+\[\s*dbo\s*\]\.\[\s*(?P<fk_table>[^\]]+)\s*\]\s+WITH\s+CHECK\s+ADD\s+CONSTRAINT\s+\[\s*(?P<constraint>[^\]]+)\s*\]\s+FOREIGN\s+KEY\s*\(\s*\[\s*(?P<fk_key>[^\]]+)\s*\]\s*\)\s+REFERENCES\s+\[\s*dbo\s*\]\.\[\s*(?P<ref_table>[^\]]+)\s*\]\s*\(\s*\[\s*(?P<ref_column>[^\]]+)\s*\]\s*\)"

regex = re.compile(pattern, re.IGNORECASE | re.DOTALL)

match = regex.search(input_text)
if match:
    groups = match.groupdict()
    print("Matched Table:", groups.get("fk_table"))
    print("Constraint:", groups.get("constraint"))
    print("Foreign Key:", groups.get("fk_key"))
    print("References Table:", groups.get("ref_table"))
    print("References Column:", groups.get("ref_column"))
else:
    print("No match found")
