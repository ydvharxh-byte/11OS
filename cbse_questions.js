// cbse_questions.js — Curated Class 11 CBSE Practice Question Bank & Generator
// Provides authentic CBSE questions with question types, marks, marking schemes, and weak-area cues.

const curatedQuestions = {
  // --- PHYSICS ---
  'dimensional analysis': [
    {
      prompt: 'Using dimensional analysis, check the correctness of the relation: v² - u² = 2as, where symbols have their usual meanings.',
      question_type: 'CONCEPTUAL',
      marks: 3,
      model_answer: 'LHS = [v²] - [u²] = [LT⁻¹]² = [L²T⁻²]. RHS = 2[a][s] = [LT⁻²][L] = [L²T⁻²]. Since LHS = RHS dimensionally, the equation is dimensionally consistent.',
      marking_scheme: '1 mark for dimensional formula of velocity & LHS, 1 mark for acceleration & displacement on RHS, 1 mark for conclusion based on principle of homogeneity.',
      weak_area_tag: 'Principle of Homogeneity'
    },
    {
      prompt: 'Deduce an expression for the time period (T) of a simple pendulum which depends on mass (m) of bob, length (l) of pendulum, and acceleration due to gravity (g).',
      question_type: 'NUMERICAL',
      marks: 3,
      model_answer: 'Let T = k · mᵃ · lᵇ · gᶜ. [T] = [M]⁰[L]⁰[T]¹ = [M]ᵃ · [L]ᵇ · [LT⁻²]ᶜ = [M]ᵃ · [L]ᵇ⁺ᶜ · [T]⁻²ᶜ. Equating powers: a = 0, -2c = 1 => c = -1/2, b + c = 0 => b = 1/2. Thus T = k√(l/g).',
      marking_scheme: '1 mark for initial proportionality setup, 1 mark for equating powers of M, L, T, 1 mark for final formula with dimensional constant k.',
      weak_area_tag: 'Power Equating in Dimensions'
    },
    {
      prompt: 'Which of the following pairs of physical quantities have the same dimensions?',
      question_type: 'MCQ',
      marks: 1,
      options: ['Work and Torque', 'Force and Power', 'Impulse and Momentum', 'Stress and Strain'],
      correct_option: 0,
      model_answer: 'Both Work and Torque have dimensions [M L² T⁻²].',
      marking_scheme: '1 mark for correct option.',
      weak_area_tag: 'Dimensional Formulas'
    },
    {
      prompt: 'Assertion (A): Dimensional analysis cannot determine the dimensionless constant in a physical formula.\nReason (R): Dimensionless constants have no units and cannot be found from MLT powers.',
      question_type: 'ASSERTION_REASON',
      marks: 1,
      options: [
        'Both A and R are true and R is the correct explanation of A',
        'Both A and R are true but R is not the correct explanation of A',
        'A is true but R is false',
        'A is false but R is true'
      ],
      correct_option: 0,
      model_answer: 'Both A and R are true and R correctly explains why dimensionless constants cannot be evaluated by dimensional methods.',
      marking_scheme: '1 mark for correct selection.',
      weak_area_tag: 'Limitations of Dimensional Analysis'
    },
    {
      prompt: 'Convert 1 Joule into ergs using dimensional analysis. (1 J in SI, 1 erg in CGS).',
      question_type: 'NUMERICAL',
      marks: 2,
      model_answer: 'Work = [M L² T⁻²]. n₂ = n₁ [M₁/M₂]¹ [L₁/L₂]² [T₁/T₂]⁻² = 1 · [1000g/1g]¹ · [100cm/1cm]² · [1s/1s]⁻² = 10³ · 10⁴ = 10⁷ ergs. Hence 1 J = 10⁷ ergs.',
      marking_scheme: '1 mark for conversion formula substitution, 1 mark for correct calculation and unit.',
      weak_area_tag: 'Unit Conversion System'
    }
  ],

  'equations of motion': [
    {
      prompt: 'A car starts from rest and accelerates uniformly at 2.5 m/s² for 8 seconds. Calculate: (i) the final velocity attained, and (ii) the distance covered during this time.',
      question_type: 'NUMERICAL',
      marks: 3,
      model_answer: 'Given: u = 0, a = 2.5 m/s², t = 8 s.\n(i) v = u + at = 0 + 2.5 × 8 = 20 m/s.\n(ii) s = ut + ½at² = 0 + 0.5 × 2.5 × 64 = 80 m.',
      marking_scheme: '1 mark for writing Given & v formula, 1 mark for velocity 20 m/s, 1 mark for distance 80 m with units.',
      weak_area_tag: 'Standard Kinematic Substitution'
    },
    {
      prompt: 'A ball is thrown vertically upwards with a velocity of 19.6 m/s from the ground. Taking g = 9.8 m/s² downwards, find: (a) maximum height reached, (b) total time of flight.',
      question_type: 'NUMERICAL',
      marks: 3,
      model_answer: 'Given: u = +19.6 m/s, v = 0 at top, a = -9.8 m/s².\n(a) v² = u² + 2as => 0 = (19.6)² + 2(-9.8)h => h = 384.16 / 19.6 = 19.6 m.\n(b) t_up = (v - u)/a = -19.6 / -9.8 = 2 s. Total time of flight = 2 × 2 = 4 s.',
      marking_scheme: '1 mark for sign convention specification, 1 mark for max height 19.6 m, 1 mark for time of flight 4 s.',
      weak_area_tag: 'Sign Convention in Free Fall'
    },
    {
      prompt: 'Can an object have a constant speed and yet have a varying velocity? Explain with an example.',
      question_type: 'SHORT_ANSWER',
      marks: 2,
      model_answer: 'Yes. In uniform circular motion, the speed remains constant but the direction of velocity changes continuously at every point, resulting in variable velocity and centripetal acceleration.',
      marking_scheme: '1 mark for correct affirmation and explanation of direction change, 1 mark for mentioning uniform circular motion as example.',
      weak_area_tag: 'Vector Nature of Velocity'
    },
    {
      prompt: 'Derive graphically the relation s = ut + ½at² for uniformly accelerated motion.',
      question_type: 'CONCEPTUAL',
      marks: 5,
      model_answer: 'In a v-t graph, distance s = area under the curve between t=0 and t. Area = Area of rectangle (u × t) + Area of triangle (½ × base × height = ½ × t × (v - u)). Since (v - u) = at, Area = ut + ½t(at) = ut + ½at².',
      marking_scheme: '1 mark for labeled v-t graph diagram, 2 marks for splitting area into rectangle and triangle, 2 marks for algebraic substitution and final expression.',
      weak_area_tag: 'Graph Area Integration'
    },
    {
      prompt: 'The displacement of a particle moving in a straight line is given by x = 3t² - 6t + 4 (in meters). At what time is the velocity of the particle zero?',
      question_type: 'MCQ',
      marks: 1,
      options: ['t = 1 s', 't = 2 s', 't = 0.5 s', 't = 3 s'],
      correct_option: 0,
      model_answer: 'v = dx/dt = d(3t² - 6t + 4)/dt = 6t - 6. Setting v = 0 gives 6t - 6 = 0 => t = 1 s.',
      marking_scheme: '1 mark for differentiation and t = 1 s.',
      weak_area_tag: 'Calculus in Kinematics'
    }
  ],

  'scalars and vectors': [
    {
      prompt: 'Two vectors of magnitudes 3 N and 4 N act at an angle of 90° to each other. Calculate the magnitude and direction of their resultant vector.',
      question_type: 'NUMERICAL',
      marks: 3,
      model_answer: 'R = √(A² + B² + 2AB cosθ) = √(3² + 4² + 2·3·4·cos90°) = √(9 + 16 + 0) = √25 = 5 N.\nDirection: tanα = (B sin90°)/(A + B cos90°) = 4/3 => α = tan⁻¹(4/3) ≈ 53.1° with the 3 N vector.',
      marking_scheme: '1.5 marks for resultant formula & calculation (5 N), 1.5 marks for direction angle formula & evaluation.',
      weak_area_tag: 'Vector Resultant & Angle'
    },
    {
      prompt: 'Find the unit vector in the direction of vector A = 3î - 4ĵ + 12k̂.',
      question_type: 'SHORT_ANSWER',
      marks: 2,
      model_answer: '|A| = √(3² + (-4)² + 12²) = √(9 + 16 + 144) = √169 = 13.\nUnit vector Â = A / |A| = (3î - 4ĵ + 12k̂) / 13 = (3/13)î - (4/13)ĵ + (12/13)k̂.',
      marking_scheme: '1 mark for magnitude calculation 13, 1 mark for dividing vector components by magnitude.',
      weak_area_tag: 'Unit Vector Calculation'
    },
    {
      prompt: 'If A · B = |A × B|, what is the angle between vectors A and B?',
      question_type: 'MCQ',
      marks: 1,
      options: ['0°', '45°', '90°', '180°'],
      correct_option: 1,
      model_answer: 'AB cosθ = AB sinθ => tanθ = 1 => θ = 45° (or π/4).',
      marking_scheme: '1 mark for correct angle 45°.',
      weak_area_tag: 'Dot vs Cross Product'
    }
  ],

  'projectile motion': [
    {
      prompt: 'A projectile is fired with a velocity of 49 m/s at an angle of 30° with the horizontal. Calculate: (i) Maximum height attained, (ii) Total time of flight, (iii) Horizontal range. (Take g = 9.8 m/s²).',
      question_type: 'NUMERICAL',
      marks: 5,
      model_answer: 'Given u = 49 m/s, θ = 30°, g = 9.8 m/s².\nu_y = u sin30° = 24.5 m/s, u_x = u cos30° = 49 × (√3/2) ≈ 42.435 m/s.\n(i) H_max = u² sin²θ / (2g) = (24.5)² / (2 × 9.8) = 600.25 / 19.6 = 30.625 m.\n(ii) T = 2u sinθ / g = 2 × 24.5 / 9.8 = 5.0 s.\n(iii) R = u² sin(2θ) / g = (49)² × sin(60°) / 9.8 = 2401 × (√3/2) / 9.8 ≈ 212.18 m.',
      marking_scheme: '1 mark for given values & formulas, 1.5 marks for H_max, 1 mark for Time of flight, 1.5 marks for Range.',
      weak_area_tag: 'Projectile Formulas & Trigonometry'
    },
    {
      prompt: 'Prove that the path of a projectile is parabolic when air resistance is neglected.',
      question_type: 'CONCEPTUAL',
      marks: 3,
      model_answer: 'x = (u cosθ)t => t = x / (u cosθ). Substitute in y = (u sinθ)t - ½gt²:\ny = (u sinθ)(x / (u cosθ)) - ½g(x / (u cosθ))² = (tanθ)x - [g / (2u² cos²θ)]x².\nThis equation is of the form y = ax - bx², which represents a parabola.',
      marking_scheme: '1 mark for horizontal displacement equation, 1 mark for vertical displacement substitution, 1 mark for concluding parabola quadratic form.',
      weak_area_tag: 'Trajectory Derivation'
    }
  ],

  'friction': [
    {
      prompt: 'A block of mass 10 kg is resting on a horizontal plane. If the coefficient of static friction is 0.4 and coefficient of kinetic friction is 0.3, find the frictional force acting on the block when a horizontal force of 30 N is applied. (Take g = 9.8 m/s²).',
      question_type: 'NUMERICAL',
      marks: 3,
      model_answer: 'Limiting friction f_s(max) = μ_s × N = μ_s × mg = 0.4 × 10 × 9.8 = 39.2 N.\nSince the applied force F = 30 N is less than f_s(max), the block does not move.\nTherefore, the static frictional force adjusts to equal the applied force: f = 30 N.',
      marking_scheme: '1 mark for computing limiting friction 39.2 N, 1 mark for comparing applied force with limiting friction, 1 mark for stating friction is self-adjusting = 30 N.',
      weak_area_tag: 'Self-adjusting Static Friction'
    },
    {
      prompt: 'Why is friction considered a necessary evil? Give two examples where it is desirable and one where it is undesirable.',
      question_type: 'SHORT_ANSWER',
      marks: 3,
      model_answer: 'It is an "evil" because it causes energy loss as heat and wear/tear of machinery. It is "necessary" because without friction we cannot walk, brake vehicles, or write on paper.\nDesirable: Walking on roads, braking system of cars.\nUndesirable: Wear and tear of machine ball bearings.',
      marking_scheme: '1 mark for definition/contrast, 1 mark for 2 desirable examples, 1 mark for undesirable example.',
      weak_area_tag: 'Conceptual Friction Applications'
    }
  ],

  // --- CHEMISTRY ---
  'matter and mole concept': [
    {
      prompt: 'Calculate the mass of: (i) 1 mole of nitrogen gas (N₂), (ii) 3.011 × 10²³ molecules of CO₂, (iii) 0.5 moles of water (H₂O). [Atomic masses: N=14, C=12, O=16, H=1].',
      question_type: 'NUMERICAL',
      marks: 3,
      model_answer: '(i) 1 mole of N₂ = molar mass = 2 × 14 = 28 g.\n(ii) Number of moles = 3.011 × 10²³ / 6.022 × 10²³ = 0.5 moles. Molar mass of CO₂ = 12 + 32 = 44 g/mol. Mass = 0.5 × 44 = 22 g.\n(iii) Mass of 0.5 mol H₂O = 0.5 × 18 = 9 g.',
      marking_scheme: '1 mark each for correct calculation and unit of parts (i), (ii), and (iii).',
      weak_area_tag: 'Avogadro Number & Molar Mass'
    },
    {
      prompt: 'A compound contains 4.07% hydrogen, 24.27% carbon and 71.65% chlorine. Its molar mass is 98.96 g. Determine its empirical and molecular formulas. [Atomic masses: H=1, C=12, Cl=35.5].',
      question_type: 'NUMERICAL',
      marks: 5,
      model_answer: 'Relative moles: C = 24.27 / 12 = 2.022; H = 4.07 / 1 = 4.07; Cl = 71.65 / 35.5 = 2.018.\nSimplest ratio: C = 2.022/2.018 = 1, H = 4.07/2.018 = 2, Cl = 2.018/2.018 = 1.\nEmpirical formula = CH₂Cl.\nEmpirical formula mass = 12 + 2 + 35.5 = 49.5 g.\nn = Molecular mass / Empirical mass = 98.96 / 49.5 ≈ 2.\nTherefore, Molecular formula = (CH₂Cl)₂ = C₂H₄Cl₂.',
      marking_scheme: '2 marks for mole calculation and simplest atomic ratio, 1 mark for empirical formula CH₂Cl, 2 marks for calculating n=2 and molecular formula C₂H₄Cl₂.',
      weak_area_tag: 'Empirical vs Molecular Formula'
    }
  ],

  'quantum numbers': [
    {
      prompt: 'Explain the four quantum numbers (n, l, m_l, m_s) and specify the permitted values for an electron in the 3d subshell.',
      question_type: 'CONCEPTUAL',
      marks: 4,
      model_answer: '1. Principal (n): Main energy shell. For 3d, n = 3.\n2. Azimuthal (l): Subshell/shape, l = 0 to (n-1). For d subshell, l = 2.\n3. Magnetic (m_l): Orientation in space, m_l = -l to +l. For l=2, m_l = -2, -1, 0, +1, +2 (5 orbitals).\n4. Spin (m_s): Spin direction, m_s = +½ or -½.',
      marking_scheme: '1 mark for each quantum number description and permitted value for 3d.',
      weak_area_tag: 'Quantum Number Rules'
    },
    {
      prompt: 'State Pauli’s Exclusion Principle and Hund’s Rule of Maximum Multiplicity.',
      question_type: 'SHORT_ANSWER',
      marks: 2,
      model_answer: 'Pauli’s Principle: No two electrons in an atom can have the same set of four quantum numbers (an orbital holds max 2 electrons with opposite spins).\nHund’s Rule: Pairing of electrons in degenerate orbitals does not take place until each orbital contains one electron with parallel spin.',
      marking_scheme: '1 mark for Pauli statement, 1 mark for Hund’s rule statement.',
      weak_area_tag: 'Electronic Configuration Principles'
    }
  ],

  'vsepr theory': [
    {
      prompt: 'Using VSEPR theory, predict the shape and bond angle of: (i) NH₃ (Ammonia), (ii) H₂O (Water), and (iii) SF₆ (Sulfur hexafluoride).',
      question_type: 'CONCEPTUAL',
      marks: 3,
      model_answer: '(i) NH₃: 3 bond pairs, 1 lone pair. Electron geometry is tetrahedral, molecular geometry is Trigonal Pyramidal. Bond angle ≈ 107° due to lone pair-bond pair repulsion.\n(ii) H₂O: 2 bond pairs, 2 lone pairs. Bent / V-shaped geometry. Bond angle ≈ 104.5°.\n(iii) SF₆: 6 bond pairs, 0 lone pairs. Octahedral geometry. Bond angle = 90°.',
      marking_scheme: '1 mark each for correct pair analysis, geometry name, and bond angle for NH₃, H₂O, and SF₆.',
      weak_area_tag: 'Lone Pair Repulsion in VSEPR'
    }
  ],

  // --- MATHEMATICS ---
  'representation of sets': [
    {
      prompt: 'Write the set A = {x : x is an integer, -3 < x < 7} in roster form.',
      question_type: 'SHORT_ANSWER',
      marks: 1,
      model_answer: 'A = {-2, -1, 0, 1, 2, 3, 4, 5, 6}.',
      marking_scheme: '1 mark for exact roster elements without omission.',
      weak_area_tag: 'Roster Notation'
    },
    {
      prompt: 'If X and Y are two sets such that X ∪ Y has 50 elements, X has 28 elements and Y has 32 elements, how many elements does X ∩ Y have?',
      question_type: 'NUMERICAL',
      marks: 2,
      model_answer: 'n(X ∪ Y) = n(X) + n(Y) - n(X ∩ Y)\n50 = 28 + 32 - n(X ∩ Y)\n50 = 60 - n(X ∩ Y) => n(X ∩ Y) = 60 - 50 = 10.',
      marking_scheme: '1 mark for set cardinality formula, 1 mark for substitution and correct answer 10.',
      weak_area_tag: 'Inclusion-Exclusion Principle'
    },
    {
      prompt: 'Let U = {1, 2, 3, 4, 5, 6, 7, 8, 9}, A = {2, 4, 6, 8} and B = {2, 3, 5, 7}. Verify De Morgan’s Law: (A ∪ B)′ = A′ ∩ B′.',
      question_type: 'CONCEPTUAL',
      marks: 4,
      model_answer: 'A ∪ B = {2, 3, 4, 5, 6, 7, 8}.\nLHS: (A ∪ B)′ = U - (A ∪ B) = {1, 9}.\nA′ = U - A = {1, 3, 5, 7, 9}.\nB′ = U - B = {1, 4, 6, 8, 9}.\nRHS: A′ ∩ B′ = {1, 9}.\nSince LHS = RHS = {1, 9}, De Morgan’s Law is verified.',
      marking_scheme: '1 mark for A ∪ B, 1 mark for LHS (A ∪ B)′, 1 mark for computing A′ and B′, 1 mark for intersection and conclusion.',
      weak_area_tag: 'De Morgan Laws & Complements'
    }
  ],

  'angles': [
    {
      prompt: 'Find the radian measure corresponding to -47° 30′.',
      question_type: 'NUMERICAL',
      marks: 2,
      model_answer: '30′ = (30/60)° = ½°. So -47° 30′ = -47½° = -95/2°.\nRadian measure = (-95/2) × (π / 180) = -19π / 72 radians.',
      marking_scheme: '1 mark for converting minutes to fractional degrees (-95/2)°, 1 mark for multiplying by π/180 and simplifying to -19π/72.',
      weak_area_tag: 'Degree-Radian Conversion'
    },
    {
      prompt: 'Prove the identity: (sin 5x + sin 3x) / (cos 5x + cos 3x) = tan 4x.',
      question_type: 'CONCEPTUAL',
      marks: 3,
      model_answer: 'Using sum to product formulas:\nsin C + sin D = 2 sin((C+D)/2) cos((C-D)/2) => sin 5x + sin 3x = 2 sin(4x) cos(x).\ncos C + cos D = 2 cos((C+D)/2) cos((C-D)/2) => cos 5x + cos 3x = 2 cos(4x) cos(x).\nLHS = [2 sin(4x) cos(x)] / [2 cos(4x) cos(x)] = sin(4x) / cos(4x) = tan 4x = RHS.',
      marking_scheme: '1 mark for applying sin C + sin D, 1 mark for applying cos C + cos D, 1 mark for canceling 2 cos x and concluding tan 4x.',
      weak_area_tag: 'Transformation Formulas in Trigonometry'
    }
  ],

  'algebraic inequalities': [
    {
      prompt: 'Solve the inequality for real x: (2x - 1)/3 ≥ (3x - 2)/4 - (2 - x)/5.',
      question_type: 'NUMERICAL',
      marks: 3,
      model_answer: 'RHS = [5(3x - 2) - 4(2 - x)] / 20 = [15x - 10 - 8 + 4x] / 20 = (19x - 18) / 20.\nSo (2x - 1)/3 ≥ (19x - 18)/20.\nMultiply both sides by 60: 20(2x - 1) ≥ 3(19x - 18)\n40x - 20 ≥ 57x - 54\n-20 + 54 ≥ 57x - 40x\n34 ≥ 17x => x ≤ 2. In interval notation: x ∈ (-∞, 2].',
      marking_scheme: '1 mark for simplifying RHS with common denominator 20, 1 mark for cross-multiplying and grouping x terms, 1 mark for final inequality and interval representation.',
      weak_area_tag: 'Sign Preservation in Cross Multiplication'
    }
  ]
};

// Generic Class 11 CBSE Question Template Generator for any topic
function generateTopicQuestions(topicTitle, chapterTitle, subjectName) {
  const normTopic = (topicTitle || '').toLowerCase().trim();
  
  // Check direct curated questions first
  for (const [key, list] of Object.entries(curatedQuestions)) {
    if (normTopic.includes(key) || key.includes(normTopic)) {
      return list;
    }
  }

  // Generate 6 authentic CBSE-style questions tailored to this specific topic
  return [
    {
      prompt: `State the fundamental definition and core principles governing ${topicTitle} in CBSE Class 11 ${subjectName}.`,
      question_type: 'CONCEPTUAL',
      marks: 2,
      model_answer: `Key definition of ${topicTitle}: State the standard textbook definition as covered in ${chapterTitle}, highlighting the governing conditions, standard assumptions, and physical/mathematical significance.`,
      marking_scheme: '1 mark for precise scientific/mathematical definition, 1 mark for physical significance or governing law.',
      weak_area_tag: 'Core Concept Definition'
    },
    {
      prompt: `Which of the following statements is true regarding ${topicTitle}?`,
      question_type: 'MCQ',
      marks: 1,
      options: [
        `It adheres strictly to the conservation and standard laws described in ${chapterTitle}.`,
        `It is independent of reference frame and initial system parameters.`,
        `It violates the foundational CBSE postulates for ${chapterTitle}.`,
        `It applies only under non-standard, imaginary boundary conditions.`
      ],
      correct_option: 0,
      model_answer: `Option A is correct: In Class 11 CBSE curriculum, ${topicTitle} operates strictly under established fundamental principles of ${chapterTitle}.`,
      marking_scheme: '1 mark for correct selection.',
      weak_area_tag: 'Conceptual Validation'
    },
    {
      prompt: `Solve a standard Class 11 numerical/derivation problem based on ${topicTitle}: Clearly state the given data, write the applicable formula, substitute appropriate values, and state the final result with proper units.`,
      question_type: 'NUMERICAL',
      marks: 3,
      model_answer: `Step 1: Given values and conventions.\nStep 2: Fundamental formula from ${topicTitle}.\nStep 3: Systematic algebraic substitution and calculation.\nStep 4: Result boxed with standard SI / mathematical notation.`,
      marking_scheme: '1 mark for given values & formula selection, 1 mark for correct algebraic substitution, 1 mark for accurate computation with units.',
      weak_area_tag: 'Step-by-step Method'
    },
    {
      prompt: `Assertion (A): Mastery of ${topicTitle} is essential for understanding advanced applications in ${chapterTitle}.\nReason (R): The mathematical relationships established in ${topicTitle} form direct prerequisites for board exam derivations.`,
      question_type: 'ASSERTION_REASON',
      marks: 1,
      options: [
        'Both A and R are true and R is the correct explanation of A',
        'Both A and R are true but R is not the correct explanation of A',
        'A is true but R is false',
        'A is false but R is true'
      ],
      correct_option: 0,
      model_answer: 'Both Assertion and Reason are true, and the Reason correctly explains the importance of topic fundamentals in CBSE.',
      marking_scheme: '1 mark for correct option.',
      weak_area_tag: 'Assertion & Reasoning Logic'
    },
    {
      prompt: `Discuss two common misconceptions or exam pitfalls students face when solving questions on ${topicTitle}. How can an examiner distinguish a strong response from a weak one?`,
      question_type: 'SHORT_ANSWER',
      marks: 3,
      model_answer: `Common pitfalls in ${topicTitle} include omitting given boundary conditions and confusion in sign conventions / unit conversions. Strong CBSE responses clearly justify assumptions, write intermediate formulas, and state final dimensions.`,
      marking_scheme: '1.5 marks for identifying 2 pitfalls, 1.5 marks for explaining the correct CBSE presentation approach.',
      weak_area_tag: 'Exam Presentation & Rubric'
    },
    {
      prompt: `Provide a detailed derivation or comprehensive application demonstrating how ${topicTitle} is utilized to solve complex problems in ${chapterTitle}.`,
      question_type: 'CONCEPTUAL',
      marks: 5,
      model_answer: `Full 5-mark answer breakdown for ${topicTitle}:\n1. Labeled diagram or schematic framework (1 mark)\n2. Initial conditions, assumptions & fundamental law (1 mark)\n3. Step-by-step mathematical derivation / analysis (2 marks)\n4. Final boxed equation, limits, and physical interpretation (1 mark).`,
      marking_scheme: '1 mark for diagram/framework, 2 marks for derivation steps, 1 mark for final equation, 1 mark for limiting cases.',
      weak_area_tag: 'Comprehensive Derivation'
    }
  ];
}

module.exports = {
  curatedQuestions,
  generateTopicQuestions
};
