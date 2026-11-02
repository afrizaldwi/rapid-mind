<?php

declare(strict_types=1);

namespace Tests\Unit\Triage;

use App\Domain\Assessment\SrqAnswer;
use App\Domain\Triage\SrqCalculator;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class SrqAnswerTest extends TestCase
{
    public static function validAnswers(): array
    {
        return [[true, true], [false, false], ['YES', true], ['NO', false], ['UNCLEAR', 'UNCLEAR'], ['UNANSWERED', 'UNANSWERED']];
    }

    #[DataProvider('validAnswers')]
    public function test_only_explicit_answer_semantics_are_normalized(mixed $input, bool|string $expected): void
    {
        $this->assertSame($expected, SrqAnswer::normalize($input));
        $this->assertSame(is_bool($expected) ? ['answer' => $expected, 'answer_state' => null] : ['answer' => null, 'answer_state' => $expected], SrqAnswer::storage($input));
    }

    public static function invalidAnswers(): array
    {
        return [[0], [1], ['0'], ['1'], ['false'], ['true'], ['yes'], ['MAYBE'], [null], [[]], [['YES']]];
    }

    #[DataProvider('invalidAnswers')]
    public function test_malformed_answers_cannot_be_coerced(mixed $value): void
    {
        $this->expectException(InvalidArgumentException::class);
        SrqAnswer::normalize($value);
    }

    public static function unresolvedAnswers(): array
    {
        return [['UNCLEAR'], ['UNANSWERED'], [null], ['false'], [1]];
    }

    #[DataProvider('unresolvedAnswers')]
    public function test_calculator_refuses_unresolved_or_malformed_q17(mixed $answer): void
    {
        $answers = array_fill_keys(range(1, 20), false);
        $answers[17] = $answer;
        $this->expectException(InvalidArgumentException::class);
        (new SrqCalculator())->calculate($answers);
    }

    public function test_calculator_refuses_missing_answers(): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new SrqCalculator())->calculate([1 => true]);
    }

    public function test_historical_boolean_score_is_unchanged(): void
    {
        $answers = array_fill_keys(range(1, 20), false);
        $answers[1] = true;
        $this->assertSame(1, (new SrqCalculator())->calculate($answers));
    }
}
