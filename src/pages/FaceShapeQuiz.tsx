import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Scissors, CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

const questions = [
  {
    id: "jawline",
    question: "How would you describe your jawline?",
    options: [
      { value: "rounded", label: "Soft and rounded", points: { round: 3, oval: 1 } },
      { value: "square", label: "Angular and defined", points: { square: 3, rectangle: 2 } },
      { value: "pointed", label: "Narrow and pointed", points: { heart: 3, triangle: 2 } },
      { value: "balanced", label: "Balanced and smooth", points: { oval: 3, round: 1 } }
    ]
  },
  {
    id: "forehead",
    question: "What about your forehead width?",
    options: [
      { value: "wide", label: "Wider than my cheekbones", points: { heart: 2, triangle: 1 } },
      { value: "narrow", label: "Narrower than my cheekbones", points: { triangle: 3, pear: 2 } },
      { value: "same", label: "About the same as my cheekbones", points: { oval: 2, square: 2, round: 1 } },
      { value: "balanced", label: "Proportional to my face", points: { oval: 3, rectangle: 1 } }
    ]
  },
  {
    id: "cheekbones",
    question: "How prominent are your cheekbones?",
    options: [
      { value: "high", label: "High and prominent", points: { diamond: 3, heart: 2 } },
      { value: "soft", label: "Soft and rounded", points: { round: 3, oval: 2 } },
      { value: "angular", label: "Angular and defined", points: { square: 3, rectangle: 2 } },
      { value: "subtle", label: "Subtle and balanced", points: { oval: 3, round: 1 } }
    ]
  },
  {
    id: "facelength",
    question: "How long is your face compared to its width?",
    options: [
      { value: "longer", label: "Noticeably longer than wide", points: { rectangle: 3, oval: 2 } },
      { value: "shorter", label: "About as wide as it is long", points: { round: 3, square: 2 } },
      { value: "balanced", label: "Slightly longer than wide", points: { oval: 3, heart: 1 } },
      { value: "equal", label: "Equal length and width", points: { square: 2, round: 2 } }
    ]
  }
];

const results = {
  oval: {
    shape: "Oval Face",
    description: "You have the most versatile face shape! Your balanced proportions allow you to pull off almost any hairstyle.",
    recommendations: [
      "Keep hair off your forehead to show off your balanced features",
      "Almost any length works great for you",
      "Both straight and textured styles look fantastic"
    ],
    idealCuts: ["Classic Haircut", "Modern Fade", "Textured Crop", "Side Part", "Quiff"],
    avoid: ["Very long hair that hides your face shape", "Styles that add too much volume on top"]
  },
  round: {
    shape: "Round Face",
    description: "Your soft, curved features are complemented by hairstyles that add height and create angles.",
    recommendations: [
      "Add height on top to elongate your face",
      "Keep sides shorter to create contrast",
      "Angular styles work best for definition"
    ],
    idealCuts: ["High Fade", "Pompadour", "Faux Hawk", "Textured Quiff", "Side Swept Undercut"],
    avoid: ["Round, full styles", "Too much volume on the sides", "Bowl cuts"]
  },
  square: {
    shape: "Square Face",
    description: "Your strong, defined jawline and forehead create a powerful look that works with structured styles.",
    recommendations: [
      "Soften angles with textured, layered cuts",
      "Side-swept styles work beautifully",
      "Keep some length on top for balance"
    ],
    idealCuts: ["Classic Side Part", "Textured Crop", "Slick Back", "Modern Quiff", "Ivy League"],
    avoid: ["Severe, geometric cuts", "Flat tops", "Very short buzz cuts"]
  },
  rectangle: {
    shape: "Rectangle/Oblong Face",
    description: "Your elongated face shape benefits from styles that add width and minimize length.",
    recommendations: [
      "Add volume on the sides for width",
      "Keep top height moderate",
      "Fringe or bangs can shorten appearance"
    ],
    idealCuts: ["Side Part with Volume", "Textured Fringe", "Caesar Cut", "Horizontal Layers", "Messy Crop"],
    avoid: ["Very tall styles", "Slicked back without volume", "Long, straight styles"]
  },
  heart: {
    shape: "Heart Face",
    description: "Your wider forehead and narrow chin create a distinctive shape that's balanced by the right cut.",
    recommendations: [
      "Add width at the jawline",
      "Keep top volume moderate",
      "Side-swept styles are flattering"
    ],
    idealCuts: ["Side Swept Undercut", "Textured Fringe", "Medium Length Layers", "Casual Quiff", "Modern Pompadour"],
    avoid: ["Too much height on top", "Very short sides", "Slicked straight back"]
  },
  triangle: {
    shape: "Triangle/Pear Face",
    description: "Your narrow forehead and wider jawline are beautifully balanced with strategic styling.",
    recommendations: [
      "Add volume on top and at the temples",
      "Keep sides relatively full",
      "Avoid emphasizing the jaw width"
    ],
    idealCuts: ["Voluminous Quiff", "Textured Top with Full Sides", "Side Part", "Brushed Up Style", "Casual Pompadour"],
    avoid: ["Very short sides", "Flat tops", "Center parts"]
  },
  diamond: {
    shape: "Diamond Face",
    description: "Your striking cheekbones and narrow forehead/chin create a unique, angular beauty.",
    recommendations: [
      "Add fullness at the forehead and chin",
      "Keep cheekbone area sleek",
      "Fringe styles work wonderfully"
    ],
    idealCuts: ["Textured Fringe", "Side Swept Style", "Quiff with Texture", "Casual Messy Top", "Medium Length Layers"],
    avoid: ["Severe, slicked back styles", "Very short all over", "Center parts"]
  }
};

const FaceShapeQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");

  const handleAnswerSelect = (value: string) => {
    setSelectedAnswer(value);
  };

  const handleNext = () => {
    if (selectedAnswer) {
      setAnswers({ ...answers, [questions[currentQuestion].id]: selectedAnswer });
      setSelectedAnswer("");
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setShowResults(true);
      }
    }
  };

  const calculateResult = () => {
    const scores = {
      oval: 0,
      round: 0,
      square: 0,
      rectangle: 0,
      heart: 0,
      triangle: 0,
      diamond: 0,
      pear: 0
    };

    Object.entries(answers).forEach(([questionId, answer]) => {
      const question = questions.find(q => q.id === questionId);
      const option = question?.options.find(o => o.value === answer);
      
      if (option) {
        Object.entries(option.points).forEach(([shape, points]) => {
          scores[shape] = (scores[shape] || 0) + points;
        });
      }
    });

    const topShape = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    return results[topShape] || results.oval;
  };

  const result = showResults ? calculateResult() : null;

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setSelectedAnswer("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12 animate-fade-up">
            <Scissors className="h-16 w-16 text-primary mx-auto mb-6 animate-glow" />
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
              Face Shape Quiz
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover your face shape and get personalized haircut recommendations
            </p>
          </div>

          {!showResults ? (
            <Card className="p-8 animate-fade-in bg-card/80 backdrop-blur-sm border-border/50">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-2xl font-bold">
                  {questions[currentQuestion].question}
                </h2>

                <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect}>
                  <div className="space-y-3">
                    {questions[currentQuestion].options.map((option) => (
                      <div key={option.value} className="relative">
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={option.value}
                          className="flex items-center gap-3 p-4 rounded-lg border-2 border-border cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        >
                          <div className="flex-1 text-base">{option.label}</div>
                          <CheckCircle2 className="h-5 w-5 text-primary opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity" />
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                <div className="flex gap-3 pt-4">
                  {currentQuestion > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentQuestion(currentQuestion - 1);
                        setSelectedAnswer(answers[questions[currentQuestion - 1].id] || "");
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    disabled={!selectedAnswer}
                    className="flex-1 gap-2"
                  >
                    {currentQuestion === questions.length - 1 ? "See Results" : "Next"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : result && (
            <div className="space-y-6 animate-fade-in">
              <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                    <Scissors className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-4xl font-bold mb-2">Your Face Shape</h2>
                  <p className="text-3xl font-bold text-primary">{result.shape}</p>
                </div>
                <p className="text-lg text-center text-muted-foreground max-w-2xl mx-auto">
                  {result.description}
                </p>
              </Card>

              <Card className="p-8 bg-card/80 backdrop-blur-sm border-border/50">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  Style Recommendations
                </h3>
                <ul className="space-y-2 mb-6">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-3">Ideal Haircuts</h4>
                    <ul className="space-y-2">
                      {result.idealCuts.map((cut, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm">{cut}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-destructive mb-3">Styles to Avoid</h4>
                    <ul className="space-y-2">
                      {result.avoid.map((style, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="h-4 w-4 rounded-full border-2 border-destructive mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{style}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={resetQuiz} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Retake Quiz
                  </Button>
                  <Link to="/services" className="flex-1">
                    <Button className="w-full gap-2">
                      <Scissors className="h-4 w-4" />
                      View Our Services
                    </Button>
                  </Link>
                  <Link to="/booking" className="flex-1">
                    <Button className="w-full gap-2">
                      Book Appointment
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceShapeQuiz;
