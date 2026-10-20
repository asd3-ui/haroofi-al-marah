import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet, StatusBar, Alert, PanResponder } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Speech from "expo-speech";

const LETTERS = [
  ["ا","ألف","أسد","🦁"],["ب","باء","بطة","🦆"],["ت","تاء","تفاحة","🍎"],["ث","ثاء","ثعلب","🦊"],
  ["ج","جيم","جمل","🐪"],["ح","حاء","حصان","🐴"],["خ","خاء","خروف","🐑"],["د","دال","دب","🐻"],
  ["ذ","ذال","ذرة","🌽"],["ر","راء","ريشة","🪶"],["ز","زاي","زهرة","🌸"],["س","سين","سمكة","🐟"],
  ["ش","شين","شمس","☀️"],["ص","صاد","صقر","🦅"],["ض","ضاد","ضفدع","🐸"],["ط","طاء","طائرة","✈️"],
  ["ظ","ظاء","ظرف","✉️"],["ع","عين","عنب","🍇"],["غ","غين","غيمة","☁️"],["ف","فاء","فراشة","🦋"],
  ["ق","قاف","قمر","🌙"],["ك","كاف","كتاب","📘"],["ل","لام","ليمون","🍋"],["م","ميم","موز","🍌"],
  ["ن","نون","نحلة","🐝"],["ه","هاء","هلال","🌙"],["و","واو","وردة","🌹"],["ي","ياء","يد","✋"]
].map(([letter, name, word, emoji], id) => ({ id, letter, name, word, emoji }));

const COLORS = ["#F97373", "#F6B73C", "#4BAE8A", "#6C8FF5", "#B47AE5", "#252B48"];

const speak = async (text) => {
  try {
    await Speech.stop();
    const voices = await Speech.getAvailableVoicesAsync();
    const arabicVoice = voices.find((voice) => /^ar([_-]|$)/i.test(voice.language || ""));
    if (!arabicVoice) {
      Alert.alert("الصوت العربي غير متوفر", "ثبّت بيانات النطق باللغة العربية من إعدادات تحويل النص إلى كلام في الهاتف، ثم أعد المحاولة.");
      return;
    }
    Speech.speak(text, {
      language: arabicVoice.language,
      voice: arabicVoice.identifier,
      rate: 0.78,
      pitch: 1.05,
      onError: () => Alert.alert("تعذّر تشغيل الصوت", "تحقق من محرك تحويل النص إلى كلام ومستوى صوت الوسائط في الهاتف.")
    });
  } catch (error) {
    Alert.alert("تعذّر تشغيل الصوت", "تحقق من إعدادات تحويل النص إلى كلام ثم أعد المحاولة.");
  }
};

const shuffled = (items) => [...items].sort(() => Math.random() - 0.5);
const randomLetterId = () => Math.floor(Math.random() * LETTERS.length);

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

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (event) => {
      const x = Math.max(0, Math.min(canvasSize.width, event.nativeEvent.pageX - canvasOrigin.current.x));
      const y = Math.max(0, Math.min(canvasSize.height, event.nativeEvent.pageY - canvasOrigin.current.y));
      const next = "M " + x + " " + y;
      currentPathRef.current = next;
      setCurrentPath(next);
    },
    onPanResponderMove: (event) => {
      const x = Math.max(0, Math.min(canvasSize.width, event.nativeEvent.pageX - canvasOrigin.current.x));
      const y = Math.max(0, Math.min(canvasSize.height, event.nativeEvent.pageY - canvasOrigin.current.y));
      const next = currentPathRef.current + " L " + x + " " + y;
      currentPathRef.current = next;
      setCurrentPath(next);
    },
    onPanResponderRelease: () => {
      if (currentPathRef.current) setPaths((old) => [...old, currentPathRef.current]);
      currentPathRef.current = "";
      setCurrentPath("");
    },
    onPanResponderTerminate: () => {
      if (currentPathRef.current) setPaths((old) => [...old, currentPathRef.current]);
      currentPathRef.current = "";
      setCurrentPath("");
    }
  }), [canvasSize.height, canvasSize.width]);

  useEffect(() => () => { Speech.stop(); }, []);

  const openLetter = (item) => {
    setSelected(item);
    setScreen("letter");
    setLearned((old) => old.includes(item.id) ? old : [...old, item.id]);
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
    } else {
      setFeedback("حاول مرة أخرى، أنت تستطيع 💪");
    }
  };

  const answerMatch = (item) => {
    if (item.id === matchQuestion) {
      setMatchFeedback("أحسنت! هذه الكلمة تبدأ بهذا الحرف ⭐");
      setScore((s) => s + 1);
    } else {
      setMatchFeedback("اقتربت! استمع إلى الحرف وحاول مرة أخرى 💪");
    }
  };

  const answerMissing = (item) => {
    if (item.id === missingQuestion) {
      setMissingFeedback("رائع! أكملت الكلمة بالحرف الصحيح ⭐");
      setScore((s) => s + 1);
    } else {
      setMissingFeedback("جرّب مرة أخرى، ما الحرف الذي تبدأ به الكلمة؟ 💪");
    }
  };

  const goHome = () => setScreen("home");

  const activityCard = (emoji, title, description, background, onPress) => (
    <Pressable accessibilityRole="button" style={[styles.activityCard, { backgroundColor: background }]} onPress={onPress}>
      <Text style={styles.activityEmoji}>{emoji}</Text>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityDescription}>{description}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8E8" />
      <View style={styles.header}>
        <Text style={styles.logo}>🌈 حروفي المرحة</Text>
        <Text style={styles.subtitle}>نتعلّم ونلعب مع الحروف!</Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>⭐ {score} نجوم</Text>
          <Text style={styles.stat}>📚 {learned.length}/28 حرفًا</Text>
        </View>
      </View>

      {screen === "home" && <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🧸</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>ماذا تريد أن تلعب اليوم؟</Text>
            <Text style={styles.heroText}>اختر نشاطك المفضل وتعلّم الحروف خطوة بخطوة.</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>اختر نشاطًا 🎈</Text>
        <View style={styles.activityGrid}>
          {activityCard("🔤", "تعلّم الحروف", "تعرّف على الحروف والكلمات", "#DFF3FF", () => setScreen("letters"))}
          {activityCard("🎨", "التلوين بالفرشاة", "مرّر إصبعك فوق الحرف", "#F0E8FF", () => startColoring(LETTERS[0]))}
          {activityCard("🔊", "استمع واختر", "استمع إلى صوت الحرف", "#E4F5EA", () => setScreen("game"))}
          {activityCard("🧩", "اربط الكلمة", "اختر الكلمة المناسبة للحرف", "#FFE8D8", () => { setMatchQuestion(randomLetterId()); setMatchFeedback(""); setScreen("match"); })}
          {activityCard("🔎", "الحرف المفقود", "أكمل الكلمة بالحرف الناقص", "#FFF0B8", () => { setMissingQuestion(randomLetterId()); setMissingFeedback(""); setScreen("missing"); })}
        </View>
        <Text style={styles.sectionTitle}>أو اختر حرفًا مباشرةً 🌟</Text>
        <View style={styles.lettersGrid}>
          {LETTERS.map((item, index) => <Pressable key={item.letter} onPress={() => openLetter(item)} style={[styles.letterTile, { backgroundColor: ["#FFE7DB", "#DFF4FF", "#E8F7DF", "#F4E5FF"][index % 4] }]}>
            <Text style={styles.letterTileText}>{item.letter}</Text>
            <Text style={styles.tinyLabel}>{learned.includes(item.id) ? "⭐" : item.name}</Text>
          </Pressable>)}
        </View>
      </ScrollView>}

      {screen === "letters" && <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={goHome}><Text style={styles.back}>→ العودة للرئيسية</Text></Pressable>
        <Text style={styles.sectionTitle}>هيا نتعرّف على الحروف 🔤</Text>
        <View style={styles.lettersGrid}>
          {LETTERS.map((item, index) => <Pressable key={item.letter} onPress={() => openLetter(item)} style={[styles.letterTile, { backgroundColor: ["#FFE7DB", "#DFF4FF", "#E8F7DF", "#F4E5FF"][index % 4] }]}>
            <Text style={styles.letterTileText}>{item.letter}</Text>
            <Text style={styles.tinyLabel}>{item.name}</Text>
          </Pressable>)}
        </View>
      </ScrollView>}

      {screen === "letter" && <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={goHome}><Text style={styles.back}>→ العودة للرئيسية</Text></Pressable>
        <View style={styles.detailCard}>
          <Text style={[styles.bigLetter, { color }]}>{selected.letter}</Text>
          <Text style={styles.letterName}>حرف {selected.name}</Text>
          <Text style={styles.wordEmoji}>{selected.emoji}</Text>
          <Text style={styles.word}>{selected.word}</Text>
          <Text style={styles.helper}>يبدأ اسم {selected.word} بحرف {selected.letter}</Text>
          <Pressable style={styles.primaryButton} onPress={() => speak("حرف " + selected.name + ". " + selected.word)}>
            <Text style={styles.primaryButtonText}>🔊 استمع إلى الحرف والكلمة</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => startColoring(selected)}>
            <Text style={styles.secondaryButtonText}>🎨 لوّن الحرف بإصبعك</Text>
          </Pressable>
        </View>
        <View style={styles.pager}>
          <Pressable style={styles.navButton} onPress={() => openLetter(LETTERS[(selected.id + 27) % 28])}><Text style={styles.navText}>السابق ←</Text></Pressable>
          <Pressable style={styles.navButton} onPress={() => openLetter(LETTERS[(selected.id + 1) % 28])}><Text style={styles.navText}>التالي →</Text></Pressable>
        </View>
      </ScrollView>}

      {screen === "color" && <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={goHome}><Text style={styles.back}>→ العودة للرئيسية</Text></Pressable>
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>🎨 لوّن الحرف بإصبعك</Text>
          <Text style={styles.helper}>اتبع شكل الحرف الرمادي بتمرير إصبعك عليه، وكأنك تتدرّب على كتابته.</Text>
          <View
            ref={canvasRef}
            style={styles.drawingCanvas}
            onLayout={(event) => {
              setCanvasSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
              requestAnimationFrame(() => canvasRef.current?.measureInWindow((x, y, width, height) => { canvasOrigin.current = { x, y }; setCanvasSize({ width, height }); }));
            }}
            {...panResponder.panHandlers}
          >
            <Text pointerEvents="none" style={styles.letterGuide}>{selected.letter}</Text>
            <Svg pointerEvents="none" width="100%" height="100%" viewBox={"0 0 " + canvasSize.width + " " + canvasSize.height} style={StyleSheet.absoluteFill}>
              {paths.map((path, index) => <Path key={index} d={path} stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
              {!!currentPath && <Path d={currentPath} stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
            </Svg>
          </View>
          <Text style={styles.helper}>اختر لون الفرشاة ثم مرّر إصبعك فوق الحرف ✍️</Text>
          <View style={styles.colorRow}>{COLORS.map((c) => <Pressable key={c} accessibilityRole="button" accessibilityLabel={"لون الفرشاة " + c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 4 : 1, borderColor: color === c ? "#252B48" : "#FFFFFF" }]} />)}</View>
          <View style={styles.pager}>
            <Pressable style={styles.navButton} onPress={() => { setPaths([]); setCurrentPath(""); currentPathRef.current = ""; }}><Text style={styles.navText}>🧹 مسح الرسم</Text></Pressable>
            <Pressable style={styles.navButton} onPress={() => startColoring(LETTERS[(selected.id + 1) % LETTERS.length])}><Text style={styles.navText}>الحرف التالي ←</Text></Pressable>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => speak("حرف " + selected.name)}><Text style={styles.primaryButtonText}>🔊 استمع إلى اسم الحرف</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={goHome}><Text style={styles.secondaryButtonText}>✨ انتهيت من التلوين</Text></Pressable>
        </View>
      </ScrollView>}

      {screen === "game" && <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={goHome}><Text style={styles.back}>→ العودة للرئيسية</Text></Pressable>
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>🎯 استمع واختر الحرف</Text>
          <Text style={styles.helper}>استمع إلى اسم الحرف ثم اختره من البطاقات.</Text>
          <Pressable style={styles.soundButton} onPress={() => speak(LETTERS[question].name)}><Text style={styles.soundText}>🔊 استمع إلى السؤال</Text></Pressable>
          <View style={styles.choices}>
            {choices.map((item) => <Pressable key={item.id} onPress={() => answer(item)} style={styles.choiceTile}><Text style={styles.choiceText}>{item.letter}</Text></Pressable>)}
          </View>
          {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
          <Pressable style={styles.primaryButton} onPress={nextQuestion}><Text style={styles.primaryButtonText}>سؤال جديد ➜</Text></Pressable>
        </View>
      </ScrollView>}

      {screen === "match" && <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={goHome}><Text style={styles.back}>→ العودة للرئيسية</Text></Pressable>
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>🧩 اربط الحرف بالكلمة</Text>
          <Text style={styles.helper}>اختر الكلمة التي تبدأ بهذا الحرف.</Text>
          <Text style={styles.matchLetter}>{LETTERS[matchQuestion].letter}</Text>
          <Pressable style={styles.soundButton} onPress={() => speak("حرف " + LETTERS[matchQuestion].name)}><Text style={styles.soundText}>🔊 استمع إلى الحرف</Text></Pressable>
          <View style={styles.wordChoices}>
            {matchChoices.map((item) => <Pressable key={item.id} onPress={() => answerMatch(item)} style={styles.wordChoice}>
              <Text style={styles.wordChoiceEmoji}>{item.emoji}</Text>
              <Text style={styles.wordChoiceText}>{item.word}</Text>
            </Pressable>)}
          </View>
          {!!matchFeedback && <Text style={styles.feedback}>{matchFeedback}</Text>}
          <Pressable style={styles.primaryButton} onPress={() => { setMatchQuestion(randomLetterId()); setMatchFeedback(""); }}><Text style={styles.primaryButtonText}>كلمة جديدة ➜</Text></Pressable>
        </View>
      </ScrollView>}

      {screen === "missing" && <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={goHome}><Text style={styles.back}>→ العودة للرئيسية</Text></Pressable>
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
            {missingChoices.map((item) => <Pressable key={item.id} onPress={() => answerMissing(item)} style={styles.choiceTile}><Text style={styles.choiceText}>{item.letter}</Text></Pressable>)}
          </View>
          {!!missingFeedback && <Text style={styles.feedback}>{missingFeedback}</Text>}
          <Pressable style={styles.primaryButton} onPress={() => { setMissingQuestion(randomLetterId()); setMissingFeedback(""); }}><Text style={styles.primaryButtonText}>كلمة جديدة ➜</Text></Pressable>
        </View>
      </ScrollView>}

      <View style={styles.footer}><Text style={styles.footerText}>نتعلّم كل يوم شيئًا جديدًا 💛</Text></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8E8" },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  logo: { textAlign: "center", fontSize: 27, fontWeight: "900", color: "#37335C" },
  subtitle: { textAlign: "center", color: "#77718E", fontSize: 14, marginTop: 4 },
  stats: { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 12 },
  stat: { backgroundColor: "#FFFFFF", overflow: "hidden", borderRadius: 18, paddingVertical: 7, paddingHorizontal: 13, color: "#514B70", fontWeight: "700" },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  hero: { backgroundColor: "#DFF3FF", borderRadius: 24, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  heroEmoji: { fontSize: 46 },
  heroTitle: { color: "#33345A", fontSize: 19, fontWeight: "900", textAlign: "right" },
  heroText: { color: "#555574", textAlign: "right", lineHeight: 22, marginTop: 4, fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#37335C", textAlign: "center", marginTop: 12, marginBottom: 12 },
  activityGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  activityCard: { width: "48%", minHeight: 132, borderRadius: 21, padding: 13, alignItems: "center", justifyContent: "center" },
  activityEmoji: { fontSize: 31 },
  activityTitle: { fontWeight: "900", color: "#403A62", marginTop: 6, textAlign: "center", fontSize: 15 },
  activityDescription: { fontSize: 11, color: "#66617D", textAlign: "center", marginTop: 4, lineHeight: 16 },
  lettersGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 9 },
  letterTile: { width: "21%", minHeight: 78, borderRadius: 17, alignItems: "center", justifyContent: "center", padding: 5 },
  letterTileText: { fontSize: 31, fontWeight: "900", color: "#383454" },
  tinyLabel: { fontSize: 11, color: "#66617D", marginTop: 1 },
  back: { textAlign: "right", fontWeight: "800", color: "#6256A8", fontSize: 15, paddingVertical: 12 },
  detailCard: { backgroundColor: "#FFFFFF", borderRadius: 26, padding: 18, alignItems: "center", marginTop: 8, shadowColor: "#3B315D", shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  bigLetter: { fontSize: 115, fontWeight: "900", lineHeight: 140 },
  letterName: { fontSize: 22, fontWeight: "900", color: "#37335C" },
  wordEmoji: { fontSize: 76, marginTop: 12 },
  word: { fontSize: 26, fontWeight: "900", color: "#363252", marginTop: 4 },
  helper: { color: "#77718E", textAlign: "center", marginVertical: 10, lineHeight: 22 },
  primaryButton: { backgroundColor: "#7063D8", paddingVertical: 14, paddingHorizontal: 18, borderRadius: 17, alignItems: "center", width: "100%", marginTop: 10 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  secondaryButton: { backgroundColor: "#EDE9FF", paddingVertical: 13, paddingHorizontal: 18, borderRadius: 17, alignItems: "center", width: "100%", marginTop: 10 },
  secondaryButtonText: { color: "#5548A7", fontSize: 15, fontWeight: "900" },
  pager: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 12, width: "100%" },
  navButton: { flex: 1, backgroundColor: "#F0E8FF", padding: 14, borderRadius: 14, alignItems: "center" },
  navText: { color: "#5548A7", fontWeight: "800", textAlign: "center" },
  drawingCanvas: { width: "100%", height: 300, borderRadius: 20, backgroundColor: "#FFFDF7", borderWidth: 2, borderColor: "#E6E0F5", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  letterGuide: { position: "absolute", fontSize: 220, lineHeight: 260, color: "#D8D4E3", fontWeight: "900", textAlign: "center", textAlignVertical: "center" },
  colorRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 14, marginVertical: 15 },
  colorDot: { width: 42, height: 42, borderRadius: 24 },
  soundButton: { backgroundColor: "#DFF3FF", padding: 14, borderRadius: 16, marginTop: 10, width: "100%", alignItems: "center" },
  soundText: { color: "#3F5789", fontWeight: "900", fontSize: 16 },
  choices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginVertical: 18 },
  choiceTile: { width: "44%", height: 90, borderRadius: 20, backgroundColor: "#F0E8FF", alignItems: "center", justifyContent: "center" },
  choiceText: { color: "#4B427C", fontWeight: "900", fontSize: 40 },
  matchLetter: { fontSize: 105, lineHeight: 125, color: "#7063D8", fontWeight: "900" },
  wordChoices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginVertical: 16 },
  wordChoice: { width: "46%", minHeight: 105, borderRadius: 18, backgroundColor: "#F0E8FF", alignItems: "center", justifyContent: "center", padding: 10 },
  wordChoiceEmoji: { fontSize: 36 },
  wordChoiceText: { fontSize: 17, color: "#403A62", fontWeight: "900", marginTop: 5 },
  missingPictureCard: { width: "100%", alignItems: "center", backgroundColor: "#F0F9FF", borderRadius: 22, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: "#D6EDFF" },
  missingPicture: { fontSize: 88, lineHeight: 112 },
  missingPictureHint: { color: "#77718E", fontSize: 14, fontWeight: "700", marginBottom: 5 },
  missingWord: { fontSize: 45, color: "#37335C", fontWeight: "900", marginVertical: 8 },
  feedback: { color: "#2C815B", fontWeight: "900", fontSize: 16, textAlign: "center", marginBottom: 8 },
  footer: { padding: 10, alignItems: "center" },
  footerText: { color: "#9991AC", fontSize: 12, fontWeight: "700" }
});
