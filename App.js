import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Alert,
  PanResponder,
  Animated,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Speech from "expo-speech";

const LETTERS = [
  ["ا", "ألف", "أسد", "🦁"], ["ب", "باء", "بطة", "🦆"], ["ت", "تاء", "تفاحة", "🍎"], ["ث", "ثاء", "ثعلب", "🦊"],
  ["ج", "جيم", "جمل", "🐪"], ["ح", "حاء", "حصان", "🐴"], ["خ", "خاء", "خروف", "🐑"], ["د", "دال", "دب", "🐻"],
  ["ذ", "ذال", "ذرة", "🌽"], ["ر", "راء", "ريشة", "🪶"], ["ز", "زاي", "زهرة", "🌸"], ["س", "سين", "سمكة", "🐟"],
  ["ش", "شين", "شمس", "☀️"], ["ص", "صاد", "صقر", "🦅"], ["ض", "ضاد", "ضفدع", "🐸"], ["ط", "طاء", "طائرة", "✈️"],
  ["ظ", "ظاء", "ظرف", "✉️"], ["ع", "عين", "عنب", "🍇"], ["غ", "غين", "غيمة", "☁️"], ["ف", "فاء", "فراشة", "🦋"],
  ["ق", "قاف", "قمر", "🌙"], ["ك", "كاف", "كتاب", "📘"], ["ل", "لام", "ليمون", "🍋"], ["م", "ميم", "موز", "🍌"],
  ["ن", "نون", "نحلة", "🐝"], ["ه", "هاء", "هلال", "🌙"], ["و", "واو", "وردة", "🌹"], ["ي", "ياء", "يد", "✋"],
].map(([letter, name, word, emoji], id) => ({ id, letter, name, word, emoji }));

const COLORS = ["#F97373", "#F6B73C", "#4BAE8A", "#6C8FF5", "#B47AE5", "#252B48"];

const CHARACTERS = [
  { name: "روبن", emoji: "🐰", accent: "#FF96B5" },
  { name: "كوكو", emoji: "🦊", accent: "#FFB062" },
  { name: "ماما", emoji: "🐼", accent: "#9AC8FF" },
  { name: "نونو", emoji: "🐻", accent: "#A9D39E" },
];

const CLOUDS = [
  { emoji: "☁️", left: 28, top: 90 },
  { emoji: "☁️", left: 72, top: 170 },
  { emoji: "⭐", left: 68, top: 120 },
  { emoji: "✨", left: 18, top: 190 },
  { emoji: "🌟", left: 80, top: 230 },
];

const speak = async (text) => {
  try {
    await Speech.stop();
    const voices = await Speech.getAvailableVoicesAsync();
    const arabicVoice = voices.find((voice) => /^ar([_-]|$)/i.test(voice.language || ""));
    if (!arabicVoice) {
      Alert.alert("الصوت العربي غير متوفر", "ثبّت بيانات النطق باللغة العربية من إعدادات تحويل النص إلى كلام في الهاتف.");
      return;
    }

    Speech.speak(text, {
      language: arabicVoice.language,
      voice: arabicVoice.identifier,
      rate: 0.78,
      pitch: 1.05,
      onError: () => Alert.alert("تعذّر تشغيل الصوت", "تحقق من محرك تحويل النص إلى كلام ومستوى صوت الوسائط في الهاتف."),
    });
  } catch (error) {
    Alert.alert("تعذّر تشغيل الصوت", "تحقق من إعدادات تحويل النص إلى كلام ثم أعد المحاولة.");
  }
};

const shuffled = (items) => [...items].sort(() => Math.random() - 0.5);
const randomLetterId = () => Math.floor(Math.random() * LETTERS.length);

const FloatingDecoration = ({ emoji, style }) => {
  const animatedY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedY, { toValue: -10, duration: 1500, useNativeDriver: true }),
        Animated.timing(animatedY, { toValue: 10, duration: 1500, useNativeDriver: true }),
        Animated.timing(animatedY, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [animatedY]);

  return (
    <Animated.View style={[style, { transform: [{ translateY: animatedY }] }]}>
      <Text style={styles.cloudText}>{emoji}</Text>
    </Animated.View>
  );
};

export default function App() {
  const [screen, setScreen] = useState("home");
  const [selected, setSelected] = useState(LETTERS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [learned, setLearned] = useState([]);
  const [question, setQuestion] = useState(4);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [matchQuestion, setMatchQuestion] = useState(2);
  const [matchFeedback, setMatchFeedback] = useState("");
  const [missingQuestion, setMissingQuestion] = useState(7);
  const [missingFeedback, setMissingFeedback] = useState("");
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [celebration, setCelebration] = useState([]);
  const [achievement, setAchievement] = useState({ title: "مغامرة اليوم", detail: "ابدأ رحلتك في التعلم" });
  const currentPathRef = useRef("");
  const [canvasSize, setCanvasSize] = useState({ width: 320, height: 300 });
  const canvasRef = useRef(null);
  const canvasOrigin = useRef({ x: 0, y: 0 });

  const choices = useMemo(() => {
    const correct = LETTERS[question];
    return shuffled([...shuffled(LETTERS.filter((item) => item.id !== correct.id)).slice(0, 3), correct]);
  }, [question]);

  const matchChoices = useMemo(() => {
    const correct = LETTERS[matchQuestion];
    return shuffled([...shuffled(LETTERS.filter((item) => item.id !== correct.id)).slice(0, 3), correct]);
  }, [matchQuestion]);

  const missingChoices = useMemo(() => {
    const correct = LETTERS[missingQuestion];
    return shuffled([...shuffled(LETTERS.filter((item) => item.id !== correct.id)).slice(0, 3), correct]);
  }, [missingQuestion]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          const x = Math.max(0, Math.min(canvasSize.width, event.nativeEvent.pageX - canvasOrigin.current.x));
          const y = Math.max(0, Math.min(canvasSize.height, event.nativeEvent.pageY - canvasOrigin.current.y));
          const next = `M ${x} ${y}`;
          currentPathRef.current = next;
          setCurrentPath(next);
        },
        onPanResponderMove: (event) => {
          const x = Math.max(0, Math.min(canvasSize.width, event.nativeEvent.pageX - canvasOrigin.current.x));
          const y = Math.max(0, Math.min(canvasSize.height, event.nativeEvent.pageY - canvasOrigin.current.y));
          const next = `${currentPathRef.current} L ${x} ${y}`;
          currentPathRef.current = next;
          setCurrentPath(next);
        },
        onPanResponderRelease: () => {
          if (currentPathRef.current) {
            setPaths((old) => [...old, currentPathRef.current]);
          }
          currentPathRef.current = "";
          setCurrentPath("");
        },
        onPanResponderTerminate: () => {
          if (currentPathRef.current) {
            setPaths((old) => [...old, currentPathRef.current]);
          }
          currentPathRef.current = "";
          setCurrentPath("");
        },
      }),
    [canvasSize.height, canvasSize.width]
  );

  const triggerCelebration = (message) => {
    const burst = Array.from({ length: 12 }, (_, index) => ({
      id: `${Date.now()}-${index}`,
      left: 20 + (index % 4) * 18,
      top: 18 + Math.floor(index / 4) * 18,
      emoji: ["⭐", "✨", "🎉", "🌟"][index % 4],
      x: (index % 3) * 28 - 28,
      y: Math.floor(index / 3) * 28 - 28,
    }));

    setCelebration(burst);
    setAchievement({ title: "إنجاز رائع", detail: message });
    setTimeout(() => setCelebration([]), 1200);
  };

  useEffect(() => () => {
    Speech.stop();
  }, []);

  const openLetter = (item) => {
    setSelected(item);
    setScreen("letter");
    setLearned((old) => (old.includes(item.id) ? old : [...old, item.id]));
  };

  const startColoring = (item = selected) => {
    setSelected(item);
    setPaths([]);
    setCurrentPath("");
    currentPathRef.current = "";
    setScreen("color");
  };

  const nextQuestion = () => {
    setQuestion(randomLetterId());
    setFeedback("");
  };

  const answer = (item) => {
    if (item.id === question) {
      setFeedback("أحسنت! إجابة رائعة ⭐");
      setScore((s) => s + 1);
      triggerCelebration(`إجابة صحيحة: ${item.letter}`);
      speak("أحسنت! هذا هو الحرف الصحيح.");
    } else {
      setFeedback("حاول مرة أخرى، أنت تستطيع 💪");
      setAchievement({ title: "جرب مجددًا", detail: "أنت على الطريق الصحيح" });
    }
  };

  const answerMatch = (item) => {
    if (item.id === matchQuestion) {
      setMatchFeedback("أحسنت! هذه الكلمة تبدأ بهذا الحرف ⭐");
      setScore((s) => s + 1);
      triggerCelebration(`كلمة صحيحة: ${item.word}`);
      speak("أحسنت! الكلمة صحيحة.");
    } else {
      setMatchFeedback("اقتربت! استمع إلى الحرف وحاول مرة أخرى 💪");
      setAchievement({ title: "اقتربت", detail: "استمع مرة أخرى" });
    }
  };

  const answerMissing = (item) => {
    if (item.id === missingQuestion) {
      setMissingFeedback("رائع! أكملت الكلمة بالحرف الصحيح ⭐");
      setScore((s) => s + 1);
      triggerCelebration(`أكملت الكلمة بشكل صحيح`);
      speak("رائع! لقد أتممت الكلمة بشكل صحيح.");
    } else {
      setMissingFeedback("جرّب مرة أخرى، ما الحرف الذي تبدأ به الكلمة؟ 💪");
      setAchievement({ title: "جرب مرة أخرى", detail: "ستفعلها في المرة القادمة" });
    }
  };

  const goHome = () => setScreen("home");

  const activityCard = (emoji, title, description, background, onPress, badge) => (
    <Pressable
      key={title}
      accessibilityRole="button"
      style={[styles.activityCard, { backgroundColor: background }]}
      onPress={onPress}
    >
      <View style={styles.activityTag}><Text style={styles.activityTagText}>{badge}</Text></View>
      <Text style={styles.activityEmoji}>{emoji}</Text>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityDescription}>{description}</Text>
    </Pressable>
  );

  const characterPill = (item, index) => (
    <View key={item.name} style={[styles.characterPill, index % 2 === 0 ? styles.characterPillLeft : styles.characterPillRight]}>
      <Text style={[styles.characterEmoji, { backgroundColor: item.accent }]}>{item.emoji}</Text>
      <Text style={styles.characterName}>{item.name}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F0" />
      <View style={styles.bgOrb} />
      <View style={styles.bgOrbTwo} />
      <View style={styles.bgOrbThree} />

      {CLOUDS.map((cloud, index) => (
        <FloatingDecoration
          key={`${cloud.emoji}-${index}`}
          emoji={cloud.emoji}
          style={{ position: "absolute", left: `${cloud.left}%`, top: cloud.top, opacity: 0.7 }}
        />
      ))}

      {celebration.length > 0 && (
        <View pointerEvents="none" style={styles.celebrationLayer}>
          {celebration.map((item) => (
            <Animated.View
              key={item.id}
              style={[
                styles.confetti,
                {
                  left: `${item.left}%`,
                  top: `${item.top}%`,
                  transform: [{ translateX: item.x }, { translateY: item.y }],
                },
              ]}
            >
              <Text style={styles.confettiText}>{item.emoji}</Text>
            </Animated.View>
          ))}
        </View>
      )}

      {screen === "home" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerCard}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarBubble}>
                <Text style={styles.avatarEmoji}>🐰</Text>
              </View>
            </View>

            <View style={styles.headerTextWrap}>
              <Text style={styles.logo}>حروفي المرحة</Text>
              <Text style={styles.subtitle}>تعلم، العب، واكتشف الحروف في عالم ملون</Text>
            </View>

            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>⭐ {score}</Text>
            </View>
          </View>

          <View style={styles.achievementPanel}>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            <Text style={styles.achievementDetail}>{achievement.detail}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{learned.length}</Text>
              <Text style={styles.statLabel}>حروف مميزة</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>28</Text>
              <Text style={styles.statLabel}>إجمالي الحروف</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>نجوم</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>🧸</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>ماذا تريد أن تلعب اليوم؟</Text>
              <Text style={styles.heroText}>اختر نشاطك المفضل وابدأ رحلة التعلم مع أصدقائك الكارتونيين.</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>أصدقاء الحروف</Text>
          <View style={styles.characterRow}>{CHARACTERS.map(characterPill)}</View>

          <Text style={styles.sectionTitle}>اختر نشاطًا</Text>
          <View style={styles.activityGrid}>
            {activityCard("🔤", "تعلّم الحروف", "تعرّف على الحروف والكلمات", "#DFF3FF", () => setScreen("letters"), "تعلم")}
            {activityCard("🎨", "التلوين", "لوّن الحرف بإصبعك", "#F2E9FF", () => startColoring(LETTERS[0]), "إبداع")}
            {activityCard("🔊", "استمع واختر", "استمع إلى صوت الحرف", "#E2F7EA", () => setScreen("game"), "صوت")}
            {activityCard("🧩", "اربط الكلمة", "اختر الكلمة المناسبة", "#FFE7D6", () => { setMatchQuestion(randomLetterId()); setMatchFeedback(""); setScreen("match"); }, "لعبة")}
            {activityCard("🔎", "الحرف المفقود", "أكمل الكلمة", "#FFF1B8", () => { setMissingQuestion(randomLetterId()); setMissingFeedback(""); setScreen("missing"); }, "تحدي")}
          </View>

          <Text style={styles.sectionTitle}>أو اختر حرفًا مباشرةً</Text>
          <View style={styles.lettersGrid}>
            {LETTERS.map((item) => (
              <Pressable
                key={item.letter}
                onPress={() => openLetter(item)}
                style={[styles.letterTile, { backgroundColor: ["#FFE7DB", "#DFF4FF", "#E8F7DF", "#F4E5FF"][item.id % 4] }]}
              >
                <Text style={styles.letterTileText}>{item.letter}</Text>
                <Text style={styles.tinyLabel}>{learned.includes(item.id) ? "⭐" : item.name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {screen === "letters" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}>
            <Text style={styles.back}>← العودة للرئيسية</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>هيا نتعرّف على الحروف</Text>
          <View style={styles.lettersGrid}>
            {LETTERS.map((item) => (
              <Pressable
                key={item.letter}
                onPress={() => openLetter(item)}
                style={[styles.letterTile, { backgroundColor: ["#FFE7DB", "#DFF4FF", "#E8F7DF", "#F4E5FF"][item.id % 4] }]}
              >
                <Text style={styles.letterTileText}>{item.letter}</Text>
                <Text style={styles.tinyLabel}>{item.name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {screen === "letter" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}>
            <Text style={styles.back}>← العودة للرئيسية</Text>
          </Pressable>
          <View style={styles.detailCard}>
            <View style={styles.detailBadge}>
              <Text style={styles.detailBadgeText}>حرف {selected.name}</Text>
            </View>
            <Text style={[styles.bigLetter, { color: COLORS[selected.id % COLORS.length] }]}>{selected.letter}</Text>
            <Text style={styles.letterName}>حرف {selected.name}</Text>
            <Text style={styles.wordEmoji}>{selected.emoji}</Text>
            <Text style={styles.word}>{selected.word}</Text>
            <Text style={styles.helper}>يبدأ اسم {selected.word} بحرف {selected.letter}</Text>
            <Pressable style={styles.primaryButton} onPress={() => speak(`حرف ${selected.name}. ${selected.word}`)}>
              <Text style={styles.primaryButtonText}>🔊 استمع إلى الحرف والكلمة</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => startColoring(selected)}>
              <Text style={styles.secondaryButtonText}>🎨 لوّن الحرف بإصبعك</Text>
            </Pressable>
          </View>

          <View style={styles.pager}>
            <Pressable style={styles.navButton} onPress={() => openLetter(LETTERS[(selected.id + 27) % 28])}>
              <Text style={styles.navText}>السابق ←</Text>
            </Pressable>
            <Pressable style={styles.navButton} onPress={() => openLetter(LETTERS[(selected.id + 1) % 28])}>
              <Text style={styles.navText}>التالي →</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {screen === "color" && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}>
            <Text style={styles.back}>← العودة للرئيسية</Text>
          </Pressable>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>🎨 لوّن الحرف بإصبعك</Text>
            <Text style={styles.helper}>اتبع شكل الحرف الرمادي بتمرير إصبعك عليه، وكأنك تتدرّب على كتابته.</Text>
            <View
              ref={canvasRef}
              style={styles.drawingCanvas}
              onLayout={(event) => {
                setCanvasSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
                requestAnimationFrame(() => {
                  canvasRef.current?.measureInWindow((x, y, width, height) => {
                    canvasOrigin.current = { x, y };
                    setCanvasSize({ width, height });
                  });
                });
              }}
              {...panResponder.panHandlers}
            >
              <Text pointerEvents="none" style={styles.letterGuide}>{selected.letter}</Text>
              <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} style={StyleSheet.absoluteFill}>
                {paths.map((path, index) => (
                  <Path key={index} d={path} stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                ))}
                {!!currentPath && <Path d={currentPath} stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
              </Svg>
            </View>
            <Text style={styles.helper}>اختر لون الفرشاة ثم مرّر إصبعك فوق الحرف ✍️</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={`لون الفرشاة ${c}`}
                  onPress={() => setColor(c)}
                  style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: "#3D2E58" }]}
                />
              ))}
            </View>
            <View style={styles.pager}>
              <Pressable style={styles.navButton} onPress={() => { setPaths([]); setCurrentPath(""); currentPathRef.current = ""; }}>
                <Text style={styles.navText}>🧹 مسح الرسم</Text>
              </Pressable>
              <Pressable style={styles.navButton} onPress={() => startColoring(LETTERS[(selected.id + 1) % LETTERS.length])}>
                <Text style={styles.navText}>الحرف التالي ←</Text>
              </Pressable>
            </View>
            <Pressable style={styles.primaryButton} onPress={() => speak(`حرف ${selected.name}`)}>
              <Text style={styles.primaryButtonText}>🔊 استمع إلى اسم الحرف</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={goHome}>
              <Text style={styles.secondaryButtonText}>✨ انتهيت من التلوين</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {screen === "game" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}>
            <Text style={styles.back}>← العودة للرئيسية</Text>
          </Pressable>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>🎯 استمع واختر الحرف</Text>
            <Text style={styles.helper}>استمع إلى اسم الحرف ثم اختره من البطاقات.</Text>
            <Pressable style={styles.soundButton} onPress={() => speak(LETTERS[question].name)}>
              <Text style={styles.soundText}>🔊 استمع إلى السؤال</Text>
            </Pressable>
            <View style={styles.choices}>
              {choices.map((item) => (
                <Pressable key={item.id} onPress={() => answer(item)} style={styles.choiceTile}>
                  <Text style={styles.choiceText}>{item.letter}</Text>
                </Pressable>
              ))}
            </View>
            {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
            <Pressable style={styles.primaryButton} onPress={nextQuestion}>
              <Text style={styles.primaryButtonText}>سؤال جديد ➜</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {screen === "match" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}>
            <Text style={styles.back}>← العودة للرئيسية</Text>
          </Pressable>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>🧩 اربط الحرف بالكلمة</Text>
            <Text style={styles.helper}>اختر الكلمة التي تبدأ بهذا الحرف.</Text>
            <Text style={styles.matchLetter}>{LETTERS[matchQuestion].letter}</Text>
            <Pressable style={styles.soundButton} onPress={() => speak(`حرف ${LETTERS[matchQuestion].name}`)}>
              <Text style={styles.soundText}>🔊 استمع إلى الحرف</Text>
            </Pressable>
            <View style={styles.wordChoices}>
              {matchChoices.map((item) => (
                <Pressable key={item.id} onPress={() => answerMatch(item)} style={styles.wordChoice}>
                  <Text style={styles.wordChoiceEmoji}>{item.emoji}</Text>
                  <Text style={styles.wordChoiceText}>{item.word}</Text>
                </Pressable>
              ))}
            </View>
            {!!matchFeedback && <Text style={styles.feedback}>{matchFeedback}</Text>}
            <Pressable style={styles.primaryButton} onPress={() => { setMatchQuestion(randomLetterId()); setMatchFeedback(""); }}>
              <Text style={styles.primaryButtonText}>كلمة جديدة ➜</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {screen === "missing" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}>
            <Text style={styles.back}>← العودة للرئيسية</Text>
          </Pressable>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>🔎 اكتشف الحرف المفقود</Text>
            <Text style={styles.helper}>انظر إلى الصورة، ثم اختر الحرف الناقص في بداية اسمها.</Text>
            <View style={styles.missingPictureCard}>
              <Text style={styles.missingPicture}>{LETTERS[missingQuestion].emoji}</Text>
              <Text style={styles.missingWord}>ـ{LETTERS[missingQuestion].word.slice(1)}</Text>
              <Text style={styles.missingPictureHint}>ما اسم هذا الشيء؟</Text>
            </View>
            <Text style={styles.helper}>اختر الحرف الذي تبدأ به الكلمة.</Text>
            <View style={styles.choices}>
              {missingChoices.map((item) => (
                <Pressable key={item.id} onPress={() => answerMissing(item)} style={styles.choiceTile}>
                  <Text style={styles.choiceText}>{item.letter}</Text>
                </Pressable>
              ))}
            </View>
            {!!missingFeedback && <Text style={styles.feedback}>{missingFeedback}</Text>}
            <Pressable style={styles.primaryButton} onPress={() => { setMissingQuestion(randomLetterId()); setMissingFeedback(""); }}>
              <Text style={styles.primaryButtonText}>كلمة جديدة ➜</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>نتعلّم كل يوم شيئًا جديدًا 💛</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF9F0",
    position: "relative",
  },
  bgOrb: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#FFD7E9",
    opacity: 0.7,
    top: -60,
    right: -40,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#E1F4FF",
    opacity: 0.8,
    bottom: 120,
    left: -30,
  },
  bgOrbThree: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFF0AE",
    opacity: 0.65,
    top: 320,
    right: 40,
  },
  cloudText: {
    fontSize: 26,
  },
  celebrationLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 10,
  },
  confetti: {
    position: "absolute",
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  confettiText: {
    fontSize: 22,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#E09D8D",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  headerLeft: {
    width: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBubble: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#FFE6A9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F3BE69",
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  headerTextWrap: {
    flex: 1,
    marginHorizontal: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2F2D4B",
    textAlign: "right",
  },
  subtitle: {
    color: "#6E6A88",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  scoreBadge: {
    backgroundColor: "#FFF4C6",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F0D787",
  },
  scoreText: {
    color: "#4E4368",
    fontWeight: "900",
    fontSize: 14,
  },
  achievementPanel: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFBC42",
  },
  achievementTitle: {
    fontSize: 12,
    color: "#7A688D",
    fontWeight: "800",
    textAlign: "right",
  },
  achievementDetail: {
    fontSize: 15,
    color: "#4F456A",
    fontWeight: "900",
    marginTop: 4,
    textAlign: "right",
  },
  statsRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#4B3C69",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#564C7B",
  },
  statLabel: {
    fontSize: 11,
    color: "#6F6A8B",
    marginTop: 3,
  },
  heroCard: {
    marginTop: 18,
    backgroundColor: "#DFF3FF",
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#76B6E6",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 2,
  },
  heroEmoji: {
    fontSize: 52,
  },
  heroTitle: {
    color: "#37335C",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
  },
  heroText: {
    color: "#555574",
    textAlign: "right",
    lineHeight: 22,
    marginTop: 5,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#37335C",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  characterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  characterPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  characterPillLeft: {
    transform: [{ translateY: 6 }],
  },
  characterPillRight: {
    transform: [{ translateY: -6 }],
  },
  characterEmoji: {
    width: 42,
    height: 42,
    borderRadius: 21,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 24,
    overflow: "hidden",
  },
  characterName: {
    color: "#534E72",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  activityCard: {
    width: "48%",
    minHeight: 150,
    borderRadius: 24,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#AB9AD1",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  activityTag: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  activityTagText: {
    fontSize: 10,
    color: "#5C4F89",
    fontWeight: "800",
  },
  activityEmoji: {
    fontSize: 32,
  },
  activityTitle: {
    fontWeight: "900",
    color: "#403A62",
    marginTop: 8,
    textAlign: "center",
    fontSize: 15,
  },
  activityDescription: {
    fontSize: 11,
    color: "#66617D",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 16,
  },
  lettersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  letterTile: {
    width: "21%",
    minHeight: 90,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(123, 108, 176, 0.12)",
  },
  letterTileText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#383454",
  },
  tinyLabel: {
    fontSize: 11,
    color: "#66617D",
    marginTop: 3,
    textAlign: "center",
  },
  back: {
    textAlign: "right",
    fontWeight: "800",
    color: "#6256A8",
    fontSize: 15,
    paddingVertical: 12,
  },
  detailCard: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 28,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#3B315D",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  detailBadge: {
    backgroundColor: "#EAE3FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  detailBadgeText: {
    fontSize: 12,
    color: "#564E79",
    fontWeight: "800",
  },
  bigLetter: {
    fontSize: 122,
    fontWeight: "900",
    lineHeight: 138,
  },
  letterName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#37335C",
  },
  wordEmoji: {
    fontSize: 72,
    marginTop: 12,
  },
  word: {
    fontSize: 28,
    fontWeight: "900",
    color: "#363252",
    marginTop: 4,
    textAlign: "center",
  },
  helper: {
    color: "#77718E",
    textAlign: "center",
    marginVertical: 10,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: "#7063D8",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    shadowColor: "#7063D8",
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "#EDE9FF",
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#5548A7",
    fontSize: 15,
    fontWeight: "900",
  },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  navButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  navText: {
    color: "#5548A7",
    fontWeight: "800",
    textAlign: "center",
  },
  drawingCanvas: {
    width: "100%",
    height: 300,
    borderRadius: 22,
    backgroundColor: "#FFFDF7",
    borderWidth: 2,
    borderColor: "#E6E0F5",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  letterGuide: {
    position: "absolute",
    fontSize: 220,
    lineHeight: 260,
    color: "#D8D4E3",
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 15,
  },
  colorDot: {
    width: 42,
    height: 42,
    borderRadius: 24,
  },
  soundButton: {
    backgroundColor: "#DFF3FF",
    padding: 14,
    borderRadius: 16,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  soundText: {
    color: "#3F5789",
    fontWeight: "900",
    fontSize: 16,
  },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginVertical: 18,
  },
  choiceTile: {
    width: "44%",
    height: 90,
    borderRadius: 20,
    backgroundColor: "#F0E8FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(112, 99, 216, 0.12)",
  },
  choiceText: {
    color: "#4B427C",
    fontWeight: "900",
    fontSize: 40,
  },
  matchLetter: {
    fontSize: 105,
    lineHeight: 125,
    color: "#7063D8",
    fontWeight: "900",
  },
  wordChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginVertical: 16,
  },
  wordChoice: {
    width: "46%",
    minHeight: 105,
    borderRadius: 18,
    backgroundColor: "#F0E8FF",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(112, 99, 216, 0.12)",
  },
  wordChoiceEmoji: {
    fontSize: 36,
  },
  wordChoiceText: {
    fontSize: 17,
    color: "#403A62",
    fontWeight: "900",
    marginTop: 5,
    textAlign: "center",
  },
  missingPictureCard: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#D6EDFF",
  },
  missingPicture: {
    fontSize: 88,
    lineHeight: 112,
  },
  missingPictureHint: {
    color: "#77718E",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 5,
  },
  missingWord: {
    fontSize: 45,
    color: "#37335C",
    fontWeight: "900",
    marginVertical: 8,
  },
  feedback: {
    color: "#2C815B",
    fontWeight: "900",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  footer: {
    padding: 12,
    alignItems: "center",
  },
  footerText: {
    color: "#9991AC",
    fontSize: 12,
    fontWeight: "700",
  },
});
