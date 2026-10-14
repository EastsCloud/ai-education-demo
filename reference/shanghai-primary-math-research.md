# Shanghai Primary Math Research Framework

This document defines how AI Education studies Shanghai-style Grade 1-6 math for question tagging and question-generation logic.

## 1. Scope

User-confirmed scope:

```text
Math first.
Research Shanghai-style Grade 1-6 mathematics at a broad range.
Analyze public curriculum / textbook / workbook-style information.
Tag the knowledge structure and item types.
Summarize our own bounded question-generation logic.
```

Important boundary:

- We do not copy copyrighted textbook or workbook questions.
- We study public curriculum structure, public topic descriptions, and common item-type patterns.
- We convert those patterns into our own `bounded item models`: seed logic, variable slots, legal bounds, validation, solution strategies, hints, and evidence tags.

## 2. Public Reference Base

Use public references as research input:

- China 2022 compulsory mathematics curriculum direction: number and algebra, graphics and geometry, statistics and probability, comprehensive and practice.
- Shanghai education context: Shanghai basic education commonly uses a five-year primary + four-year junior-middle structure, so Grade 6 should be treated as a primary-to-junior transition year in our system.
- Shanghai-style practice references: public descriptions of `一课一练` / Shanghai Maths Project show the value of structured, progressive, curriculum-aligned practice, but we do not copy their questions.
- Chinese elementary math problem datasets such as CMATH / Ape210K are useful for understanding item diversity and tagging needs, but our production items must be generated and validated by our own logic library.

Source URLs:

- https://zh.wikipedia.org/wiki/上海教育
- https://zh.wikipedia.org/wiki/上海数学·一课一练
- https://zh.wikipedia.org/wiki/一課一練_(教輔)
- https://arxiv.org/abs/2306.16636
- https://arxiv.org/abs/2009.11506
- https://www.1edtech.org/standards/qti

## 3. Grade 1-6 Knowledge Coverage

Use a full-range map, not a narrow MVP-only map.

| Grade | Main coverage | AI Education focus |
| --- | --- | --- |
| G1 | Number sense, addition/subtraction, comparison, simple shapes, position, time/money seeds | Build quantity language and relation awareness |
| G2 | Larger numbers, multiplication/division introduction, measurement, simple word problems, basic data | Connect operation meaning with situations |
| G3 | Multi-step operations, fractions seed, area/perimeter seed, time/length/weight, tables | Detect step reasoning and unit stability |
| G4 | Larger integer operations, decimals seed, operation laws, angle/line/shape, data displays | Build transfer from arithmetic to structure |
| G5 | Fractions/decimals/percent seeds, equations seed, area/volume, rate/ratio seeds, statistics | Prepare algebraic thinking and model choice |
| G6 | Ratio/proportion, percent applications, linear equations, coordinate/geometry transition, statistics/probability bridge | Bridge to middle-school algebra and formal modeling |

## 4. Knowledge Domain Tags

All math items should carry at least these domain tags:

```text
number_and_operation
quantity_relationship
equation_and_algebra_seed
fraction_decimal_percent
measurement_and_units
geometry_and_space
statistics_and_probability
comprehensive_application
```

## 5. Ability Evidence Tags

All items should map to observable ability evidence:

```text
read_context
extract_conditions
identify_unknown
translate_to_math_language
select_operation_or_model
build_equation_or_relation
compute_stably
handle_units
draw_or_use_visual_model
explain_or_check_answer
transfer_variant
resist_distractor
```

## 6. Item Type Families

The current executable catalog contains 41 bounded item families. It is intentionally broader than one short test: a formal assessment samples a small rotating subset, while the full catalog defines the curriculum space the system can accumulate evidence across.

| Family | Typical grades | Generation logic |
| --- | --- | --- |
| compare_more_less | G1-G3 | two quantities, difference, more/less wording, missing part |
| part_whole_add_subtract | G1-G3 | whole = part + part, missing whole or part |
| equal_groups_multiply_divide | G2-G4 | unit amount, group count, total, missing one variable |
| measurement_conversion | G2-G5 | unit conversion plus arithmetic |
| time_elapsed_simple | G1-G3 | whole-hour / minute elapsed time in a familiar activity |
| money_price_total | G1-G3 | price addition in G1; unit-price and total relationship in G2-G3 |
| operation_structure_distributive | G4-G5 | repeated group structure, use of `groups x (part A + part B)` |
| perimeter_area_rectangle | G3-G5 | length, width, perimeter/area, missing variable |
| fraction_part_whole | G3-G5 | part, whole, fraction, comparison |
| decimal_money_measure | G4-G6 | decimal quantities in money/measure context |
| multi_step_total_quantity | G3-G5 | add two quantities, then group / divide with an exact result |
| average_total_count | G4-G6 | average, total, count, missing variable |
| ratio_rate_unit | G5-G6 | ratio, rate, unit rate, proportional reasoning |
| geometry_angle_reasoning | G4-G6 | adjacent-angle / straight-angle relation and visual-model reasoning |
| volume_rectangular_prism | G5-G6 | rectangular-prism volume from length, width, height |
| distance_speed_time | G5-G6 | distance = speed x time in a unit-consistent context |
| probability_event_decimal | G5-G6 | equal-likelihood event, favorable outcomes / all outcomes, decimal response |
| coordinate_movement | G6 | coordinate movement, horizontal coordinate change, spatial language |
| percent_change | G5-G6 | base, rate, amount, increase/decrease |
| linear_equation_word_problem | G5-G6 | one unknown, equation from context |
| data_table_chart | G2-G6 | read table/chart, compare, compute, infer |
| number_composition_place_value | G1-G3 | tens and ones, composition and place value |
| unknown_part_add_subtract | G1-G3 | whole and known part, solve the missing part |
| fraction_add_same_denominator | G4-G6 | combine equal fractional parts in a contextual quantity |
| decimal_multiply_unit_price | G5-G6 | decimal unit quantity multiplied by count |
| ratio_total_split | G5-G6 | split a total by a stated ratio |
| circle_area_application | G5-G6 | radius, circle count, and area |
| square_perimeter_intro | G2-G4 | one side of a square, then perimeter as four equal sides |
| division_remainder_grouping | G3-G4 | grouping with a remainder and an "at least" decision |
| fraction_subtract_same_denominator | G4-G6 | compare two equal-denominator fractional quantities |
| decimal_divide_equal_share | G5-G6 | decimal total divided equally to find a unit amount |
| data_range_comparison | G3-G5 | read maximum and minimum from a small data set and compare them |
| triangle_area_application | G5-G6 | base, corresponding height, and triangle area |
| addition_subtraction_regrouping | G1-G3 | two-digit carry addition or borrow subtraction in an everyday context |
| multiplication_division_inverse | G2-G4 | use multiplication or exact division to find total or one equal part |
| integer_operation_order | G3-G5 | grouped quantity plus an extra quantity, with operation order made explicit |
| fraction_equivalent_compare | G4-G6 | compare unlike-denominator fractional quantities through a shared denominator |
| decimal_rounding_estimation | G4-G6 | round a contextual decimal quantity to a stated place value |
| circle_circumference_application | G5-G6 | radius, circle count, and circumference with `π = 3.14` |
| trapezoid_area_application | G5-G6 | upper base, lower base, height, and trapezoid area |
| proportion_scale_application | G6 | map scale, drawing length, unit conversion, and actual distance |

The eight newest families close important gaps in foundational operations, fraction comparison, decimal estimation, circle circumference, trapezoid area, and map-scale reasoning. Each one is a real bounded generator with a numeric answer rule, grade-aware seed range, controlled original/one-number/two-number/context variants, four-phase support, knowledge-graph links, and validation coverage. They are not display-only catalog entries.

### 6.1 Grade-Aware Generation

`gradeBands` tells the system which curriculum stages a family may support. It does not mean that every stage should receive the same numbers or cognitive load.

For every generated item, the backend resolves one `instructionalGrade` inside the family's allowed grade bands. A grade-aware seed range narrows the numerical space for the earlier grades and expands it only as the family reaches later grades. The resolved grade is stored in all three places that matter for later evidence work:

```text
systemLevelTags.instructionalGrade
difficultyTags.instructionalGrade
generationTags.instructionalGrade
```

The initial and stage assessments pass their assessment grade into the same generator. The daily queue uses the learner's current instructional grade, not merely the long-term target grade. This keeps one item-model library while preventing a G2 version of a family from silently using its G4 number range or a G6 goal from skipping the G2 learning range.

### 6.2 Versioned Curriculum Routes

The catalog is broader than a single learner's active route. Each confirmed learning plan stores a route version:

```text
math-learning-path-v2 = historic route retained for an existing confirmed plan
math-learning-path-v3 = prior reviewed route retained for an existing confirmed plan
math-learning-path-v4 = reviewed route for newly confirmed plans, including all 41 current families
```

This preserves a student's already-confirmed curve position when the library grows. A new catalog family can be researched, validated, mapped, and added to the V4 sequence without silently moving an existing learner to a different daily focus.

## 7. Tagging Pipeline

For each public topic / item-type pattern:

1. Identify grade band and domain.
2. Identify prerequisite nodes.
3. Convert the pattern into a bounded item model.
4. Define legal variable slots.
5. Define answer rule.
6. Define validation rule.
7. Define layered hints.
8. Define guided-step mode.
9. Define ability evidence.
10. Link it to the knowledge atlas.

No item enters practice or testing until:

```text
metadata complete
answer rule verified
steps verified
hints verified
quality status >= system_validated
```

## 8. Research Output

This research should produce three assets:

1. `curriculum_scope`: Grade 1-6 knowledge map.
2. `item_model_library`: bounded generation logic for each item family.
3. `tagging_schema`: labels that connect item, knowledge atlas, ability map, behavior data, and report.

These assets are useful in both semi-AI and full-AI versions.
