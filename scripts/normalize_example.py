"""Architecture stub only. Replace mock adapters with real Shopify/QBO extractors."""
KEYWORDS = {
    "Sponsorship": ["sponsorship", "sponsored"],
    "Product Seeding": ["seeded", "seeding", "product seeding"],
    "Gift / Giveaway": ["gift", "giveaway"],
    "Influencer / Ambassador": ["influencer", "ambassador"],
    "PR / Press": ["press", " pr "],
    "Samples / Reviews": ["sample", "review"],
    "Social / Content Creator": ["social", "content creator", "creator"],
}

def classify(searchable_fields):
    """Return type + exact evidence. Never classify without storing why."""
    for field_name, raw_value in searchable_fields.items():
        value = f" {raw_value or ''} ".lower()
        for label, words in KEYWORDS.items():
            for word in words:
                if word in value:
                    return {"type": label, "detected_by": f"{field_name}: {word}", "confidence": "High"}
    return {"type": "Other", "detected_by": "No deterministic rule", "confidence": "Low"}
