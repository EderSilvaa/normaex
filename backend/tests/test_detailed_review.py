import sys
import os
import json

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.ai import review_generated_text

def test_detailed_review():
    print("Testing Detailed Review Logic...")
    
    # Sample weak text to trigger review
    weak_text = "oii galera tudo bom hj vou falar de ia. inteligencia artificial eh legal."
    
    # Sample strong text
    strong_text = """
    A Inteligência Artificial (IA) tem transformado diversos setores da sociedade contemporânea.
    No âmbito jurídico, ferramentas de automação prometem maior celeridade processual, embora levantem questões éticas significativas.
    Este estudo analisa os impactos da IA na advocacia, com foco na otimização de rotinas e na tomada de decisão.
    """
    
    print("\n--- Reviewing Weak Text ---")
    review_weak = review_generated_text(
        text=weak_text,
        section_type="introducao",
        format_type="abnt",
        instruction="Escreva uma introdução sobre IA."
    )
    
    print(json.dumps(review_weak, indent=2, ensure_ascii=False))
    
    print("\n--- Reviewing Strong Text ---")
    review_strong = review_generated_text(
        text=strong_text,
        section_type="introducao",
        format_type="abnt",
        instruction="Escreva uma introdução sobre IA."
    )
    
    print(json.dumps(review_strong, indent=2, ensure_ascii=False))

    # Assertions
    if "detailed_review" not in review_weak:
        print("FAIL: detailed_review key missing in weak text review")
        return
        
    criteria = review_weak["detailed_review"].get("criteria", [])
    if len(criteria) != 6:
        print(f"FAIL: Expected 6 criteria, got {len(criteria)}")
        return
        
    print("\nSUCCESS: Detailed review structure verified.")

if __name__ == "__main__":
    test_detailed_review()
