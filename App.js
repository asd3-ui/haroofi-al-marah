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
  TextInput,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  { name: "روبن", emoji: "🐰", accent: "#FF96B5", description: "مغامر لطيف يحب استكشاف كل حرف" },
  { name: "كوكو", emoji: "🦊", accent: "#FFB062", description: "شجاع وذكي ويحب التحدي" },
  { name: "ماما", emoji: "🐼", accent: "#9AC8FF", description: "هادئة وداعمة وتحب التعلم" },
  { name: "نونو", emoji: "🐻", accent: "#A9D39E", description: "مرح ومبدع في كل نشاط" },
];

const LEVELS = [
  { level: 1, name: "مغامر صغير", required: 0, color: "#FFD4A0" },
  { level: 2, name: "متعلّم جديد", required: 5, color: "#BFE6FF" },
  { level: 3, name: "محلل أحرف", required: 12, color: "#D7F5C7" },
  { level: 4, name: "خبير الكلمات", required: 20, color: "#E4D6FF" },
  { level: 5, name: "أسطورة التعلم", required: 30, color: "#FFC5DD" },
];

const CLOUDS = [
  { emoji: "☁️", left: 28, top: 90 },
  { emoji: "☁️", left: 72, top: 170 },
  { emoji: "⭐", left: 68, top: 120 },
  { emoji: "✨", left: 18, top: 190 },
  { emoji: "🌟", left: 80, top: 230 },
];

const BADGES = [
  { id: "starter", title: "مغامر اليوم", icon: "🚀", unlocked: (score) => score >= 0 },
  { id: "curious", title: "متعلّم فضولي", icon: "📚", unlocked: (score, learned) => learned.length >= 5 },
  { id: "smart", title: "ذكي الأحرف", icon: "🧠", unlocked: (score) => score >= 8 },
  { id: "champion", title: "بطل الكلمات", icon: "🏆", unlocked: (score) => score >= 15 },
  { id: "legend", title: "أسطورة اللعب", icon: "👑", unlocked: (score) => score >= 25 },
];

const STORAGE_KEY = "haroofi-al-marah-profile";

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
  const [screen, setScreen] = useState("onboarding");
  const [selected, setSelected] = useState(LETTERS[0]);
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0]);
  const [avatarColor, setAvatarColor] = useState("#FFB5D9");
  const [childName, setChildName] = useState("أحمد");
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
  const [musicOn, setMusicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [certificateUnlocked, setCertificateUnlocked] = useState(false);
  const [starsCollection, setStarsCollection] = useState([]);
  const musicRef = useRef(null);
  const currentPathRef = useRef("");
  const [canvasSize, setCanvasSize] = useState({ width: 320, height: 300 });
  const canvasRef = useRef(null);
  const canvasOrigin = useRef({ x: 0, y: 0 });

  const persisted = useRef(false);

  const levelInfo = useMemo(() => {
    const unlocked = LEVELS.filter((item) => score >= item.required).at(-1) || LEVELS[0];
    const nextLevel = LEVELS.find((item) => item.required > score) || LEVELS[LEVELS.length - 1];
    const progress = Math.min(100, Math.round(((score - unlocked.required) / Math.max(1, nextLevel.required - unlocked.required)) * 100));
    return { unlocked, nextLevel, progress };
  }, [score]);

  const unlockedBadges = useMemo(
    () => BADGES.filter((badge) => badge.unlocked(score, learned)).map((badge) => badge.title),
    [learned, score]
  );

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

  const playPositiveTone = async () => {
    if (!soundOn) return;
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg",
      });
      await sound.playAsync();
    } catch (error) {
      // Ignore audio errors and keep app functional.
    }
  };

  const startBackgroundMusic = async () => {
    if (!musicOn) {
      if (musicRef.current) {
        await musicRef.current.stopAsync();
      }
      return;
    }

    try {
      if (!musicRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
          { isLooping: true, volume: 0.16 }
        );
        musicRef.current = sound;
      }
      await musicRef.current.playAsync();
    } catch (error) {
      // Keep the experience working if audio is unavailable.
    }
  };

  useEffect(() => {
    startBackgroundMusic();
    return () => {
      if (musicRef.current) {
        musicRef.current.stopAsync();
      }
    };
  }, [musicOn]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const profile = JSON.parse(raw);
        if (profile.childName) setChildName(profile.childName);
        if (profile.avatarColor) setAvatarColor(profile.avatarColor);
        if (profile.selectedCharacter) setSelectedCharacter(profile.selectedCharacter);
        if (profile.score) setScore(profile.score);
        if (profile.learned) setLearned(profile.learned);
        if (profile.musicOn !== undefined) setMusicOn(profile.musicOn);
        if (profile.soundOn !== undefined) setSoundOn(profile.soundOn);
        if (profile.completedLevels) setCompletedLevels(profile.completedLevels);
        if (profile.starsCollection) setStarsCollection(profile.starsCollection);
        if (profile.certificateUnlocked) setCertificateUnlocked(profile.certificateUnlocked);
      } catch (error) {
        console.log("Load profile failed", error);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (!persisted.current) {
      persisted.current = true;
      return;
    }

    const saveProfile = async () => {
      try {
        const payload = {
          childName,
          avatarColor,
          selectedCharacter,
          score,
          learned,
          musicOn,
          soundOn,
          completedLevels,
          starsCollection,
          certificateUnlocked,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.log("Save profile failed", error);
      }
    };

    saveProfile();
  }, [avatarColor, childName, completedLevels, certificateUnlocked, learned, musicOn, score, selectedCharacter, soundOn, starsCollection]);

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
    playPositiveTone();
  };

  useEffect(() => {
    const unlocked = LEVELS.filter((item) => score >= item.required).map((item) => item.name);
    setCompletedLevels(unlocked);

    if (score >= 25) {
      setCertificateUnlocked(true);
    }
  }, [score]);

  useEffect(() => {
    if (score >= 0 && !starsCollection.includes("starter")) {
      setStarsCollection((prev) => [...prev, "starter"]);
    }
    if (learned.length >= 5 && !starsCollection.includes("curious")) {
      setStarsCollection((prev) => [...prev, "curious"]);
    }
    if (score >= 8 && !starsCollection.includes("smart")) {
      setStarsCollection((prev) => [...prev, "smart"]);
    }
    if (score >= 15 && !starsCollection.includes("champion")) {
      setStarsCollection((prev) => [...prev, "champion"]);
    }
    if (score >= 25 && !starsCollection.includes("legend")) {
      setStarsCollection((prev) => [...prev, "legend"]);
    }
  }, [learned.length, score, starsCollection]);

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
      triggerCelebration("أكملت الكلمة بشكل صحيح");
      speak("رائع! لقد أتممت الكلمة بشكل صحيح.");
    } else {
      setMissingFeedback("جرّب مرة أخرى، ما الحرف الذي تبدأ به الكلمة؟ 💪");
      setAchievement({ title: "جرب مرة أخرى", detail: "ستفعلها في المرة القادمة" });
    }
  };

  const goHome = () => setScreen("home");

  const openDashboard = () => setScreen("dashboard");

  const openCertificate = () => setScreen("certificate");

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
    <Pressable
      key={item.name}
      onPress={() => setSelectedCharacter(item)}
      style={[styles.characterPill, index % 2 === 0 ? styles.characterPillLeft : styles.characterPillRight, selectedCharacter.name === item.name && styles.characterSelected]}
    >
      <Text style={[styles.characterEmoji, { backgroundColor: item.accent }]}>{item.emoji}</Text>
      <Text style={styles.characterName}>{item.name}</Text>
    </Pressable>
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

      {screen === "onboarding" && (
        <ScrollView contentContainerStyle={styles.onboardingContent} showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeEmoji}>🎉</Text>
            <Text style={styles.welcomeTitle}>مرحبًا بك في حروفي المرحة</Text>
            <Text style={styles.welcomeText}>اختر اسمك وشخصيتك المفضلة، ثم ابدأ رحلتك في عالم الحروف واللعب.</Text>
          </View>

          <Text style={styles.sectionTitle}>معلومات الطفل</Text>
          <View style={styles.profileCard}>
            <Text style={styles.inputLabel}>اسم الطفل</Text>
            <TextInput
              value={childName}
              onChangeText={setChildName}
              style={styles.input}
              placeholder="اكتب اسم الطفل"
              placeholderTextColor="#7C7495"
            />

            <Text style={styles.inputLabel}>لون الملف الشخصي</Text>
            <View style={styles.colorRow}>
              {[
                "#FFB5D9",
                "#BFE6FF",
                "#D7F5C7",
                "#FDE9A8",
                "#EAD9FF",
                "#FFD4C4",
              ].map((colorValue) => (
                <Pressable
                  key={colorValue}
                  onPress={() => setAvatarColor(colorValue)}
                  style={[styles.avatarColorDot, { backgroundColor: colorValue, borderWidth: avatarColor === colorValue ? 3 : 0, borderColor: "#4B3F7A" }]}
                />
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>اختر بطل رحلتك</Text>
          <View style={styles.characterRowOnboarding}>
            {CHARACTERS.map((character) => (
              <Pressable
                key={character.name}
                onPress={() => setSelectedCharacter(character)}
                style={[styles.onboardingCharacter, selectedCharacter.name === character.name && styles.characterSelected]}
              >
                <Text style={[styles.onboardingCharacterEmoji, { backgroundColor: character.accent }]}>{character.emoji}</Text>
                <Text style={styles.onboardingCharacterName}>{character.name}</Text>
                <Text style={styles.onboardingDescription}>{character.description}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.playerCard}>
            <Text style={styles.playerLabel}>الشخصية المختارة</Text>
            <Text style={styles.playerName}>{selectedCharacter.emoji} {selectedCharacter.name}</Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={() => { setScreen("home"); speak("مرحبًا، هيا نبدأ التعلم"); }}>
            <Text style={styles.primaryButtonText}>ابدأ اللعب 🚀</Text>
          </Pressable>
        </ScrollView>
      )}

      {screen === "home" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerCard}>
            <Pressable style={styles.headerLeft} onPress={() => setScreen("onboarding")}>
              <View style={[styles.avatarBubble, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarEmoji}>{selectedCharacter.emoji}</Text>
              </View>
            </Pressable>

            <View style={styles.headerTextWrap}>
              <Text style={styles.logo}>حروفي المرحة</Text>
              <Text style={styles.subtitle}>مرحبا بك، {childName || "طفلي"}!</Text>
            </View>

            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>⭐ {score}</Text>
            </View>
          </View>

          <View style={styles.achievementPanel}>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            <Text style={styles.achievementDetail}>{achievement.detail}</Text>
          </View>

          <View style={styles.levelPanel}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelBadge}>المستوى {levelInfo.unlocked.level}</Text>
              <Text style={styles.levelName}>{levelInfo.unlocked.name}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${levelInfo.progress}%`, backgroundColor: levelInfo.unlocked.color }]} />
            </View>
            <Text style={styles.levelHint}>التقدم: {levelInfo.progress}%</Text>
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

          <View style={styles.quickRow}>
            <Pressable style={styles.quickButton} onPress={openDashboard}>
              <Text style={styles.quickButtonText}>لوحة المتابعة 📊</Text>
            </Pressable>
            <Pressable style={styles.quickButton} onPress={() => setMusicOn((v) => !v)}>
              <Text style={styles.quickButtonText}>{musicOn ? "إيقاف الموسيقى 🔇" : "تشغيل الموسيقى 🔊"}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>أصدقاء الحروف</Text>
          <View style={styles.characterRow}>{CHARACTERS.map(characterPill)}</View>

          <Text style={styles.sectionTitle}>المكافآت</Text>
          <View style={styles.badgesRow}>
            {BADGES.map((badge) => {
              const unlocked = badge.unlocked(score, learned);
              return (
                <View key={badge.id} style={[styles.badgeCard, !unlocked && styles.badgeLocked]}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={[styles.badgeTitle, !unlocked && styles.badgeTitleLocked]}>{badge.title}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>اختر نشاطًا</Text>
          <View style={styles.activityGrid}>
            {activityCard("🔤", "تعلّم الحروف", "تعرّف على الحروف والكلمات", "#DFF3FF", () => setScreen("letters"), "تعلم")}
            {activityCard("🎨", "التلوين", "لوّن الحرف بإصبعك", "#F2E9FF", () => startColoring(LETTERS[0]), "إبداع")}
            {activityCard("🔊", "استمع واختر", "استمع إلى صوت الحرف", "#E2F7EA", () => setScreen("game"), "صوت")}
            {activityCard("🧩", "اربط الكلمة", "اختر الكلمة المناسبة", "#FFE7D6", () => { setMatchQuestion(randomLetterId()); setMatchFeedback(""); setScreen("match"); }, "لعبة")}
            {activityCard("🔎", "الحرف المفقود", "أكمل الكلمة", "#FFF1B8", () => { setMissingQuestion(randomLetterId()); setMissingFeedback(""); setScreen("missing"); }, "تحدي")}
          </View>

          {certificateUnlocked && (
            <Pressable style={styles.certificateButton} onPress={openCertificate}>
              <Text style={styles.certificateButtonText}>عرض الشهادة 🎖️</Text>
            </Pressable>
          )}

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

      {screen === "certificate" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}><Text style={styles.back}>← العودة للرئيسية</Text></Pressable>
          <View style={styles.certificateCard}>
            <Text style={styles.certificateIcon}>🏆</Text>
            <Text style={styles.certificateTitle}>شهادة إنجاز</Text>
            <Text style={styles.certificateName}>{childName || "طفلي"}</Text>
            <Text style={styles.certificateText}>تمت مكافأة هذا الطفل بنجاح في تعلم الحروف العربية، واستكشاف الكلمات، وتحقيق مستويات عالية في المرح والتعلّم.</Text>
            <Text style={styles.certificateMeta}>النجوم: {score} · الحروف: {learned.length}/28</Text>
          </View>
        </ScrollView>
      )}

      {screen === "dashboard" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}><Text style={styles.back}>← العودة للرئيسية</Text></Pressable>
          <Text style={styles.sectionTitle}>لوحة متابعة الوالدين / المعلم</Text>

          <View style={styles.dashboardCard}>
            <Text style={styles.dashboardLabel}>اسم الطفل</Text>
            <Text style={styles.dashboardValue}>{childName || "غير محدد"}</Text>
            <Text style={styles.dashboardLabel}>عدد النجوم</Text>
            <Text style={styles.dashboardValue}>{score} ⭐</Text>
            <Text style={styles.dashboardLabel}>الحروف المكتسبة</Text>
            <Text style={styles.dashboardValue}>{learned.length}/28</Text>
            <Text style={styles.dashboardLabel}>المستوى الحالي</Text>
            <Text style={styles.dashboardValue}>{levelInfo.unlocked.name}</Text>
          </View>

          <View style={styles.dashboardCard}>
            <Text style={styles.sectionTitleSmall}>المكافآت المفتوحة</Text>
            <View style={styles.badgesRow}>
              {BADGES.filter((badge) => badge.unlocked(score, learned)).map((badge) => (
                <View key={badge.id} style={styles.smallBadge}>
                  <Text style={styles.smallBadgeIcon}>{badge.icon}</Text>
                  <Text style={styles.smallBadgeText}>{badge.title}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.dashboardCard}>
            <Text style={styles.sectionTitleSmall}>مراحل الإنجاز</Text>
            {LEVELS.map((level) => (
              <View key={level.level} style={styles.levelRow}>
                <Text style={styles.levelBubble}>{level.level}</Text>
                <Text style={styles.levelNameRow}>{level.name}</Text>
                <Text style={styles.levelDot}>{score >= level.required ? "✔️" : "⏳"}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {screen === "letters" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}><Text style={styles.back}>← العودة للرئيسية</Text></Pressable>
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
          <Pressable onPress={goHome}><Text style={styles.back}>← العودة للرئيسية</Text></Pressable>
          <View style={styles.detailCard}>
            <View style={styles.detailBadge}><Text style={styles.detailBadgeText}>حرف {selected.name}</Text></View>
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
            <Pressable style={styles.navButton} onPress={() => openLetter(LETTERS[(selected.id + 27) % 28])}><Text style={styles.navText}>السابق ←</Text></Pressable>
            <Pressable style={styles.navButton} onPress={() => openLetter(LETTERS[(selected.id + 1) % 28])}><Text style={styles.navText}>التالي →</Text></Pressable>
          </View>
        </ScrollView>
      )}

      {screen === "color" && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}><Text style={styles.back}>← العودة للرئيسية</Text></Pressable>
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
              <Pressable style={styles.navButton} onPress={() => { setPaths([]); setCurrentPath(""); currentPathRef.current = ""; }}><Text style={styles.navText}>🧹 مسح الرسم</Text></Pressable>
              <Pressable style={styles.navButton} onPress={() => startColoring(LETTERS[(selected.id + 1) % LETTERS.length])}><Text style={styles.navText}>الحرف التالي ←</Text></Pressable>
            </View>
            <Pressable style={styles.primaryButton} onPress={() => speak(`حرف ${selected.name}`)}><Text style={styles.primaryButtonText}>🔊 استمع إلى اسم الحرف</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={goHome}><Text style={styles.secondaryButtonText}>✨ انتهيت من التلوين</Text></Pressable>
          </View>
        </ScrollView>
      )}

      {screen === "game" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}><Text style={styles.back}>← العودة للرئيسية</Text></Pressable>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>🎯 استمع واختر الحرف</Text>
            <Text style={styles.helper}>استمع إلى اسم الحرف ثم اختره من البطاقات.</Text>
            <Pressable style={styles.soundButton} onPress={() => speak(LETTERS[question].name)}><Text style={styles.soundText}>🔊 استمع إلى السؤال</Text></Pressable>
            <View style={styles.choices}>
              {choices.map((item) => (
                <Pressable key={item.id} onPress={() => answer(item)} style={styles.choiceTile}><Text style={styles.choiceText}>{item.letter}</Text></Pressable>
              ))}
            </View>
            {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
            <Pressable style={styles.primaryButton} onPress={nextQuestion}><Text style={styles.primaryButtonText}>سؤال جديد ➜</Text></Pressable>
          </View>
        </ScrollView>
      )}

      {screen === "match" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}><Text style={styles.back}>← العودة للرئيسية</Text></Pressable>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>🧩 اربط الحرف بالكلمة</Text>
            <Text style={styles.helper}>اختر الكلمة التي تبدأ بهذا الحرف.</Text>
            <Text style={styles.matchLetter}>{LETTERS[matchQuestion].letter}</Text>
            <Pressable style={styles.soundButton} onPress={() => speak(`حرف ${LETTERS[matchQuestion].name}`)}><Text style={styles.soundText}>🔊 استمع إلى الحرف</Text></Pressable>
            <View style={styles.wordChoices}>
              {matchChoices.map((item) => (
                <Pressable key={item.id} onPress={() => answerMatch(item)} style={styles.wordChoice}>
                  <Text style={styles.wordChoiceEmoji}>{item.emoji}</Text>
                  <Text style={styles.wordChoiceText}>{item.word}</Text>
                </Pressable>
              ))}
            </View>
            {!!matchFeedback && <Text style={styles.feedback}>{matchFeedback}</Text>}
            <Pressable style={styles.primaryButton} onPress={() => { setMatchQuestion(randomLetterId()); setMatchFeedback(""); }}><Text style={styles.primaryButtonText}>كلمة جديدة ➜</Text></Pressable>
          </View>
        </ScrollView>
      )}

      {screen === "missing" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goHome}><Text style={styles.back}>← العودة للرئيسية</Text></Pressable>
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
                <Pressable key={item.id} onPress={() => answerMissing(item)} style={styles.choiceTile}><Text style={styles.choiceText}>{item.letter}</Text></Pressable>
              ))}
            </View>
            {!!missingFeedback && <Text style={styles.feedback}>{missingFeedback}</Text>}
            <Pressable style={styles.primaryButton} onPress={() => { setMissingQuestion(randomLetterId()); setMissingFeedback(""); }}><Text style={styles.primaryButtonText}>كلمة جديدة ➜</Text></Pressable>
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}><Text style={styles.footerText}>نتعلّم كل يوم شيئًا جديدًا 💛</Text></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F0", position: "relative" },
  bgOrb: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "#FFD7E9", opacity: 0.7, top: -60, right: -40 },
  bgOrbTwo: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#E1F4FF", opacity: 0.8, bottom: 120, left: -30 },
  bgOrbThree: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "#FFF0AE", opacity: 0.65, top: 320, right: 40 },
  cloudText: { fontSize: 26 },
  celebrationLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, pointerEvents: "none", zIndex: 10 },
  confetti: { position: "absolute", width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  confettiText: { fontSize: 22 },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  onboardingContent: { paddingHorizontal: 16, paddingBottom: 40 },
  welcomeCard: { marginTop: 22, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 28, padding: 22, alignItems: "center" },
  welcomeEmoji: { fontSize: 60 },
  welcomeTitle: { fontSize: 28, fontWeight: "900", color: "#2F2D4B", textAlign: "center", marginTop: 8 },
  welcomeText: { fontSize: 14, lineHeight: 22, color: "#5D5A7B", textAlign: "center", marginTop: 8 },
  profileCard: { marginTop: 14, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 22, padding: 16 },
  inputLabel: { fontSize: 12, color: "#5D5A7B", fontWeight: "800", marginBottom: 8, textAlign: "right" },
  input: { backgroundColor: "#F7F4FF", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, color: "#2F2D4B", borderWidth: 1, borderColor: "#E7DFFF", textAlign: "right" },
  avatarColorDot: { width: 38, height: 38, borderRadius: 19, marginHorizontal: 5 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#37335C", textAlign: "center", marginTop: 20, marginBottom: 12 },
  sectionTitleSmall: { fontSize: 16, fontWeight: "900", color: "#37335C", textAlign: "center", marginBottom: 12 },
  characterRowOnboarding: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginTop: 8 },
  onboardingCharacter: { width: "46%", backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 22, padding: 14, alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  onboardingCharacterEmoji: { width: 68, height: 68, borderRadius: 34, textAlign: "center", textAlignVertical: "center", fontSize: 38, overflow: "hidden" },
  onboardingCharacterName: { fontSize: 18, fontWeight: "900", color: "#413A63", marginTop: 10 },
  onboardingDescription: { fontSize: 11, color: "#676080", textAlign: "center", marginTop: 8, lineHeight: 16 },
  playerCard: { marginTop: 18, backgroundColor: "#EAF7FF", borderRadius: 20, padding: 14, alignItems: "center" },
  playerLabel: { fontSize: 12, color: "#58718E", fontWeight: "800" },
  playerName: { fontSize: 22, color: "#313A5F", fontWeight: "900", marginTop: 8 },
  headerCard: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 26, paddingHorizontal: 14, paddingVertical: 16, marginTop: 12, flexDirection: "row", alignItems: "center", shadowColor: "#E09D8D", shadowOpacity: 0.14, shadowRadius: 14, elevation: 3 },
  headerLeft: { width: 62, alignItems: "center", justifyContent: "center" },
  avatarBubble: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#F3BE69", shadowOpacity: 0.25, shadowRadius: 8 },
  avatarEmoji: { fontSize: 32 },
  headerTextWrap: { flex: 1, marginHorizontal: 8 },
  logo: { fontSize: 28, fontWeight: "900", color: "#2F2D4B", textAlign: "right" },
  subtitle: { color: "#6E6A88", fontSize: 12, textAlign: "right", marginTop: 4 },
  scoreBadge: { backgroundColor: "#FFF4C6", borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "#F0D787" },
  scoreText: { color: "#4E4368", fontWeight: "900", fontSize: 14 },
  achievementPanel: { marginTop: 14, backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 20, padding: 12, borderLeftWidth: 4, borderLeftColor: "#FFBC42" },
  achievementTitle: { fontSize: 12, color: "#7A688D", fontWeight: "800", textAlign: "right" },
  achievementDetail: { fontSize: 15, color: "#4F456A", fontWeight: "900", marginTop: 4, textAlign: "right" },
  levelPanel: { marginTop: 14, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 20, padding: 12 },
  levelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelBadge: { backgroundColor: "#EDE8FF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, color: "#564C7B", fontWeight: "900", fontSize: 12 },
  levelName: { color: "#665B84", fontWeight: "900", fontSize: 13 },
  progressBar: { marginTop: 10, height: 14, backgroundColor: "#F0E9FF", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  levelHint: { marginTop: 8, textAlign: "right", color: "#655E7D", fontSize: 12, fontWeight: "700" },
  statsRow: { marginTop: 18, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  statCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 20, paddingVertical: 14, paddingHorizontal: 12, alignItems: "center", shadowColor: "#4B3C69", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: "900", color: "#564C7B" },
  statLabel: { fontSize: 11, color: "#6F6A8B", marginTop: 3 },
  heroCard: { marginTop: 18, backgroundColor: "#DFF3FF", borderRadius: 28, padding: 18, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#76B6E6", shadowOpacity: 0.15, shadowRadius: 12, elevation: 2 },
  heroEmoji: { fontSize: 52 },
  heroTitle: { color: "#37335C", fontSize: 20, fontWeight: "900", textAlign: "right" },
  heroText: { color: "#555574", textAlign: "right", lineHeight: 22, marginTop: 5, fontSize: 13 },
  quickRow: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  quickButton: { flex: 1, backgroundColor: "#EDE8FF", paddingVertical: 12, borderRadius: 16, alignItems: "center" },
  quickButtonText: { color: "#4F4275", fontWeight: "900", fontSize: 12 },
  characterRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  characterPill: { flex: 1, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 18, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  characterPillLeft: { transform: [{ translateY: 6 }] },
  characterPillRight: { transform: [{ translateY: -6 }] },
  characterSelected: { borderColor: "#7A63D6", backgroundColor: "#F0EEFF" },
  characterEmoji: { width: 42, height: 42, borderRadius: 21, textAlign: "center", textAlignVertical: "center", fontSize: 24, overflow: "hidden" },
  characterName: { color: "#534E72", fontSize: 11, fontWeight: "800", marginTop: 5 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  badgeCard: { width: "31%", backgroundColor: "#FFF7D8", borderRadius: 18, padding: 10, alignItems: "center" },
  badgeLocked: { opacity: 0.45 },
  badgeIcon: { fontSize: 26 },
  badgeTitle: { marginTop: 6, fontSize: 11, fontWeight: "800", color: "#4C4668", textAlign: "center" },
  badgeTitleLocked: { color: "#7A7490" },
  certificateButton: { marginTop: 14, backgroundColor: "#FFE6A8", borderRadius: 18, paddingVertical: 14, alignItems: "center" },
  certificateButtonText: { color: "#4E4368", fontWeight: "900", fontSize: 15 },
  activityGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  activityCard: { width: "48%", minHeight: 150, borderRadius: 24, padding: 13, alignItems: "center", justifyContent: "center", shadowColor: "#AB9AD1", shadowOpacity: 0.14, shadowRadius: 10, elevation: 2 },
  activityTag: { alignSelf: "flex-end", backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
  activityTagText: { fontSize: 10, color: "#5C4F89", fontWeight: "800" },
  activityEmoji: { fontSize: 32 },
  activityTitle: { fontWeight: "900", color: "#403A62", marginTop: 8, textAlign: "center", fontSize: 15 },
  activityDescription: { fontSize: 11, color: "#66617D", textAlign: "center", marginTop: 5, lineHeight: 16 },
  lettersGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  letterTile: { width: "21%", minHeight: 90, borderRadius: 20, alignItems: "center", justifyContent: "center", padding: 6, borderWidth: 1, borderColor: "rgba(123, 108, 176, 0.12)" },
  letterTileText: { fontSize: 32, fontWeight: "900", color: "#383454" },
  tinyLabel: { fontSize: 11, color: "#66617D", marginTop: 3, textAlign: "center" },
  back: { textAlign: "right", fontWeight: "800", color: "#6256A8", fontSize: 15, paddingVertical: 12 },
  certificateCard: { backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 28, padding: 24, alignItems: "center", marginTop: 10 },
  certificateIcon: { fontSize: 70 },
  certificateTitle: { fontSize: 32, fontWeight: "900", color: "#37335C", marginTop: 6 },
  certificateName: { fontSize: 28, fontWeight: "900", color: "#5B4B9A", marginTop: 8 },
  certificateText: { textAlign: "center", color: "#5D5A7B", fontSize: 15, lineHeight: 23, marginTop: 12 },
  certificateMeta: { marginTop: 12, color: "#4C4668", fontWeight: "800" },
  dashboardCard: { backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 24, padding: 16, marginBottom: 14 },
  dashboardLabel: { color: "#6C6987", fontSize: 12, marginTop: 10, fontWeight: "800" },
  dashboardValue: { color: "#2F2C4A", fontSize: 24, fontWeight: "900", marginTop: 4 },
  smallBadge: { width: "31%", backgroundColor: "#F0EEFF", borderRadius: 16, padding: 10, alignItems: "center" },
  smallBadgeIcon: { fontSize: 20 },
  smallBadgeText: { fontSize: 10, color: "#4C4668", fontWeight: "800", marginTop: 4, textAlign: "center" },
  levelRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#EFEAF9" },
  levelBubble: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#EAE3FF", textAlign: "center", textAlignVertical: "center", fontWeight: "900", color: "#5C4A8D" },
  levelNameRow: { flex: 1, marginLeft: 10, color: "#453E66", fontWeight: "800" },
  levelDot: { fontSize: 18 },
  detailCard: { backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 28, padding: 18, alignItems: "center", marginTop: 8, shadowColor: "#3B315D", shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  detailBadge: { backgroundColor: "#EAE3FF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8 },
  detailBadgeText: { fontSize: 12, color: "#564E79", fontWeight: "800" },
  bigLetter: { fontSize: 122, fontWeight: "900", lineHeight: 138 },
  letterName: { fontSize: 22, fontWeight: "900", color: "#37335C" },
  wordEmoji: { fontSize: 72, marginTop: 12 },
  word: { fontSize: 28, fontWeight: "900", color: "#363252", marginTop: 4, textAlign: "center" },
  helper: { color: "#77718E", textAlign: "center", marginVertical: 10, lineHeight: 22 },
  primaryButton: { backgroundColor: "#7063D8", paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, alignItems: "center", width: "100%", marginTop: 10, shadowColor: "#7063D8", shadowOpacity: 0.18, shadowRadius: 10 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  secondaryButton: { backgroundColor: "#EDE9FF", paddingVertical: 13, paddingHorizontal: 18, borderRadius: 18, alignItems: "center", width: "100%", marginTop: 10 },
  secondaryButtonText: { color: "#5548A7", fontSize: 15, fontWeight: "900" },
  pager: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 12, width: "100%" },
  navButton: { flex: 1, backgroundColor: "rgba(255,255,255,0.7)", padding: 14, borderRadius: 16, alignItems: "center" },
  navText: { color: "#5548A7", fontWeight: "800", textAlign: "center" },
  drawingCanvas: { width: "100%", height: 300, borderRadius: 22, backgroundColor: "#FFFDF7", borderWidth: 2, borderColor: "#E6E0F5", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  letterGuide: { position: "absolute", fontSize: 220, lineHeight: 260, color: "#D8D4E3", fontWeight: "900", textAlign: "center", textAlignVertical: "center" },
  colorRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 10, marginVertical: 15 },
  colorDot: { width: 42, height: 42, borderRadius: 24 },
  soundButton: { backgroundColor: "#DFF3FF", padding: 14, borderRadius: 16, marginTop: 10, width: "100%", alignItems: "center" },
  soundText: { color: "#3F5789", fontWeight: "900", fontSize: 16 },
  choices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginVertical: 18 },
  choiceTile: { width: "44%", height: 90, borderRadius: 20, backgroundColor: "#F0E8FF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(112, 99, 216, 0.12)" },
  choiceText: { color: "#4B427C", fontWeight: "900", fontSize: 40 },
  matchLetter: { fontSize: 105, lineHeight: 125, color: "#7063D8", fontWeight: "900" },
  wordChoices: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginVertical: 16 },
  wordChoice: { width: "46%", minHeight: 105, borderRadius: 18, backgroundColor: "#F0E8FF", alignItems: "center", justifyContent: "center", padding: 10, borderWidth: 1, borderColor: "rgba(112, 99, 216, 0.12)" },
  wordChoiceEmoji: { fontSize: 36 },
  wordChoiceText: { fontSize: 17, color: "#403A62", fontWeight: "900", marginTop: 5, textAlign: "center" },
  missingPictureCard: { width: "100%", alignItems: "center", backgroundColor: "#F0F9FF", borderRadius: 22, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: "#D6EDFF" },
  missingPicture: { fontSize: 88, lineHeight: 112 },
  missingPictureHint: { color: "#77718E", fontSize: 14, fontWeight: "700", marginBottom: 5 },
  missingWord: { fontSize: 45, color: "#37335C", fontWeight: "900", marginVertical: 8 },
  feedback: { color: "#2C815B", fontWeight: "900", fontSize: 16, textAlign: "center", marginBottom: 8 },
  footer: { padding: 12, alignItems: "center" },
  footerText: { color: "#9991AC", fontSize: 12, fontWeight: "700" },
});
