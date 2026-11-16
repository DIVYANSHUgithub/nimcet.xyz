from decimal import Decimal, ROUND_HALF_UP


def result_metrics(correct, incorrect, unanswered):
    attempted = correct + incorrect
    total = attempted + unanswered
    def percentage(numerator, denominator):
        return (Decimal(numerator)*100/denominator).quantize(Decimal('0.01'),rounding=ROUND_HALF_UP) if denominator else None
    return {'attempted_count':attempted,'total_questions':total,
            'accuracy_percentage':percentage(correct,attempted),
            'correct_percentage':percentage(correct,total)}
