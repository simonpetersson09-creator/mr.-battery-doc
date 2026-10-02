/** French report copy. Same structure as the Swedish source text. */
import type { ReportCopy } from "./copy";

export const fr: ReportCopy = {
  "notAvailable": "Non disponible",
  "brand": "Mr. Battery Doc",
  "before": "Sans batterie",
  "perYear": "/an",
  "reportIdLabel": "ID du rapport",
  "title": "Rapport de batterie",
  "after": "Avec batterie",
  "pageLabel": "Page",
  "cannotBeCalculated": "Calcul impossible",
  "created": "Créé",
  "engineVersionLabel": "Version de calcul",
  "tagline": "Une façon plus intelligente d'utiliser votre électricité",
  "source": {
    "user": "Votre valeur",
    "calculated": "Calculé",
    "default": "Hypothèse par défaut",
    "external": "Source de données externe"
  },
  "ofLabel": "de",
  "searchLimit": {
    "atLeastCapacity": "Au moins {value}",
    "atLeastPower": "Au moins {value}",
    "capacityNote": "La limite de capacité supérieure de l'analyse a été atteinte. Une batterie plus grande pourrait être plus avantageuse.",
    "powerNote": "La limite de puissance supérieure de l'analyse a été atteinte. Un système de puissance supérieure peut nécessiter une analyse distincte.",
    "bothNote": "Le site a atteint la limite de dimensionnement supérieure de l'analyse. Les systèmes plus grands nécessitent une étude technique approfondie."
  },
  "footerTagline": "De meilleures décisions pour un avenir plus radieux",
  "energy": {
    "title": "Bilan énergétique sans et avec batterie",
    "load": "Consommation annuelle",
    "pv": "Production solaire",
    "importBefore": "Importation réseau sans batterie",
    "importAfter": "Importation réseau avec batterie",
    "exportLabel": "Exportation réseau",
    "exportBefore": "Exportation sans batterie",
    "exportAfter": "Exportation avec batterie",
    "selfConsumptionBefore": "Autoconsommation sans batterie",
    "selfConsumptionAfter": "Autoconsommation avec batterie",
    "selfSufficiencyBefore": "Autosuffisance sans batterie",
    "selfSufficiencyAfter": "Autosuffisance avec batterie",
    "gridCharged": "Énergie chargée depuis le réseau",
    "shifted": "Solaire différé",
    "losses": "Pertes de la batterie",
    "cycles": "Cycles complets équivalents par an"
  },
  "summary": {
    "title": "Résumé",
    "capacity": "Capacité de la batterie",
    "power": "Puissance de la batterie",
    "benefit": "Valeur économique estimée, année 1",
    "maxInvestment": "Investissement maximal pour le temps de retour choisi",
    "improvements": "Améliorations pour le bâtiment",
    "selfConsumption": "Autoconsommation",
    "selfSufficiency": "Autosuffisance",
    "gridImport": "Importation réseau",
    "peak": "Puissance de pointe",
    "shifted": "solaire déplacé",
    "peakLower": "pointe réduite",
    "recommendedBattery": "Batterie recommandée",
    "paybackLabel": "Temps de retour choisi",
    "valueSplit": "Répartition de la valeur économique",
    "shiftedSolar": "Solaire déplacé",
    "ancillaryShareNote": "De la valeur économique estimée, {value} proviennent des services système, sur la base des prix historiques du marché.",
    "subtitle": "Batterie recommandée et valeur estimée pour votre bâtiment",
    "improvementsSubtitle": "La batterie vous permet d'utiliser plus de votre propre électricité et d'en acheter moins sur le réseau.",
    "selfConsumptionHint": "Part de l'électricité solaire utilisée directement dans le bâtiment.",
    "selfSufficiencyHint": "Part de la consommation électrique couverte par votre propre électricité.",
    "gridImportHint": "Électricité achetée sur le réseau.",
    "shiftedSolarHint": "Une plus grande partie de votre production solaire est utilisée dans le bâtiment au lieu d'être injectée sur le réseau.",
    "percentagePoints": "points de pourcentage",
    "perYearLong": "par an"
  },
  "risks": {
    "title": "Qu'est-ce qui peut affecter le résultat ?",
    "text": "Le rapport est une aide à la décision, et non une garantie ni un devis. Le résultat réel peut différer, entre autres, en raison de :",
    "items": [
      "la consommation électrique réelle et le profil de charge",
      "la production solaire réelle",
      "les prix de l'électricité et les frais de réseau",
      "les frais de puissance et les modèles tarifaires",
      "l'efficacité et la dégradation de la batterie",
      "la disponibilité de la batterie au cours de l'année",
      "les prix et conditions sur le marché des services auxiliaires",
      "les conditions de l'agrégateur et les frais éventuels",
      "les règles du marché et les contraintes du réseau"
    ]
  },
  "ancillaryScenario": {
    "title": "Comparaison des tailles de batterie pour les services auxiliaires",
    "intro": "Le dimensionnement standard n'a identifié aucun besoin de batterie. Voici une comparaison de la rémunération pour les services auxiliaires avec différentes tailles de batterie.",
    "notRecommendation": "Ceci est un scénario de comparaison, et non une taille de batterie recommandée.",
    "technicalTitle": "Proposition technique",
    "technicalHint": "La taille est choisie pour qu'au moins 95 % de la capacité de service auxiliaire calculée pour votre profil de connexion et de consommation puisse être utilisée. C'est une proposition technique, et non une affirmation sur la batterie la plus rentable.",
    "battery": "Batterie",
    "compensation": "Rémunération auxiliaire",
    "totalBenefit": "Bénéfice total calculé",
    "maxInvestment": "Investissement maximum pour le temps de retour sur investissement choisi",
    "maxInvestmentNone": "Ne peut pas être calculé",
    "note": "Le calcul est basé sur les niveaux de rémunération historiques. La rémunération réelle, la disponibilité et la capacité à participer aux services auxiliaires dépendent entre autres du marché, de l'agrégateur et des exigences techniques."
  },
  "about": {
    "pageTitle": "Important à savoir",
    "title": "À propos de ce rapport",
    "items": [
      "Le rapport est une aide à la décision et doit être complété par un devis et une évaluation sur site.",
      "Ce rapport n'est pas un devis et n'indique pas le coût d'une batterie sur le marché.",
      "Le résultat est un calcul basé sur vos saisies et les hypothèses de calcul, et ne constitue pas une garantie.",
      "Le calcul couvre l'année 1.",
      "Aucune évolution future des prix n'est incluse dans le calcul.",
      "Aucune dégradation future de la batterie n'est incluse dans le calcul."
    ]
  },
  "grid": {
    "title": "Puissance et réseau",
    "fuse": "Fusible principal",
    "connection": "Raccordement au réseau",
    "theoretical": "Capacité théorique du réseau",
    "peakBefore": "Pic d'importation sans batterie",
    "peakAfter": "Pic d'importation avec batterie",
    "reduction": "Écrêtage de pointe",
    "curtailed": "Exportation bloquée",
    "status": "Évaluation du réseau",
    "kwKwh": "Le kW est la puissance : la vitesse de charge ou de décharge de la batterie. Le kWh est l'énergie : sa capacité de stockage."
  },
  "benefit": {
    "title": "D'où vient la valeur ?",
    "total": "Valeur économique estimée, année 1",
    "energy": "Énergie solaire décalée et achat d'électricité réduit",
    "energyHint": "La batterie stocke le surplus de production et utilise l'énergie lorsque le bâtiment en a besoin.",
    "energyNoSolarHint": "La batterie se charge lorsque l'électricité est moins chère et est utilisée lorsque le bâtiment en a besoin.",
    "peak": "Écrêtement des pointes",
    "peakHint": "La batterie peut réduire les pointes de puissance et ainsi diminuer les coûts en cas de facturation à la puissance appelée.",
    "ancillary": "Services auxiliaires",
    "ancillaryHint": "Rémunération estimée du service sélectionné, basée sur les prix historiques du marché et les hypothèses du calcul.",
    "none": "Le calcul ne montre aucun avantage économique mesurable avec vos données actuelles.",
    "note": "Le calcul couvre l'année 1. Le rapport ne contient aucune prévision pluriannuelle, car le calcul ne modélise pas les prix futurs ni la dégradation.",
    "historicalBox": "Calcul historique – pas un revenu futur garanti.",
    "shareOfTotal": "du total"
  },
  "terms": {
    "kwKwh": "Le kW est la puissance : ce que la batterie peut charger ou décharger à un instant donné. Le kWh est l'énergie : ce qu'elle peut stocker.",
    "selfConsumption": "L'autoconsommation est la part de la production solaire utilisée sur place au lieu d'être exportée vers le réseau.",
    "selfSufficiency": "L'autosuffisance est la part de la consommation électrique de la propriété couverte par l'électricité autoproduite plutôt que par l'électricité achetée.",
    "peakShaving": "L'écrêtage des pointes signifie que la batterie réduit les pics de consommation les plus élevés, ce qui peut réduire les frais de puissance."
  },
  "installer": {
    "title": "À vérifier avec l'installateur",
    "items": [
      "Vérifier que la capacité de batterie proposée est adaptée au logement.",
      "Vérifier que la puissance de la batterie et de l'onduleur proposée est techniquement possible.",
      "Vérifier le fusible principal et le raccordement au réseau auprès du gestionnaire de réseau.",
      "Vérifier si l'installation nécessite des modifications du tableau électrique.",
      "Vérifier l'emplacement de l'installation, les exigences de température et la sécurité incendie.",
      "Vérifier les garanties et la durée de vie prévue de la batterie.",
      "Vérifier la puissance de charge et de décharge autorisée.",
      "Vérifier la compatibilité avec une installation solaire existante ou prévue.",
      "Vérifier les conditions pour les services auxiliaires, l'agrégateur et la préqualification.",
      "Comparer le prix proposé avec l'investissement maximal indiqué dans ce rapport."
    ]
  },
  "sizing": {
    "title": "Pourquoi cette batterie ?",
    "capacity": "Capacité",
    "power": "Puissance",
    "cRate": "Taux C",
    "physicalNeed": "Besoin en puissance physique",
    "basePower": "Puissance de base pour la gestion d'énergie",
    "alternatives": "Alternatives simulées",
    "lower": "Plus petite",
    "yours": "Votre batterie",
    "higher": "Plus grande",
    "balance": "L'alternative du milieu est la taille qui, d'après le calcul, offre le meilleur équilibre entre la taille de la batterie et le bénéfice estimé. Cela ne signifie pas qu'elle soit objectivement la meilleure à tous égards.",
    "consumerExplanation": "Mr. Battery Doc simule plusieurs tailles de batterie en fonction de la consommation de la propriété, de la production solaire et des utilisations sélectionnées. Dans ce cas, la taille recommandée offre un bon équilibre entre la taille de la batterie et le bénéfice estimé. Une batterie plus grande n'apporte que peu d'avantages supplémentaires et n'est donc pas recommandée.",
    "recommendedLabel": "Recommandée",
    "powerTitle": "Puissance de la batterie : {value}",
    "powerAncillaryExplanation": "Environ {value} est requis pour la gestion énergétique de la propriété. La puissance supérieure recommandée offre une plus grande capacité pour le service complémentaire sélectionné."
  },
  "investment": {
    "title": "Investissement maximum et temps de retour",
    "selected": "Temps de retour choisi",
    "max": "Investissement maximum",
    "scenarios": "Investissement maximum pour différents temps de retour",
    "yourChoice": "Votre choix",
    "explanation": "L'investissement maximum n'est pas un prix de marché estimé ni un devis. Il indique le niveau d'investissement qui correspond au temps de retour choisi, sur la base de la valeur économique issue du calcul.",
    "notAQuote": "Le montant n'est ni un prix de marché estimé, ni un devis. Il découle uniquement de la valeur économique estimée et du temps de retour que vous avez choisi.",
    "unavailable": "L'investissement maximum ne peut pas être calculé car le calcul n'indique aucune valeur économique positive.",
    "headline": "Votre point de référence pour un devis",
    "paybackText": "Pour un temps de retour choisi de {years}, le calcul donne un investissement maximum d'environ {amount}.",
    "ancillaryDependencyTitle": "Avec et sans services système",
    "withAncillary": "Valeur économique avec le service système sélectionné",
    "withoutAncillary": "Valeur économique hors services système",
    "dependencyNote": "La comparaison montre quelle part du calcul dépend de la rémunération estimée des services système."
  },
  "assumptions": {
    "title": "Vos données et hypothèses de calcul",
    "property": "La propriété",
    "battery": "La batterie",
    "economy": "Économie",
    "ancillary": "Services auxiliaires",
    "annualConsumption": "Consommation annuelle",
    "solarProduction": "Production solaire",
    "consumptionProfile": "Profil de consommation",
    "fuse": "Disjoncteur principal",
    "connection": "Raccordement",
    "gridPowerLimit": "Puissance de raccordement maximale",
    "capacity": "Capacité",
    "power": "Puissance",
    "efficiency": "Rendement aller-retour",
    "socWindow": "Limites SOC",
    "reserveSoc": "SOC réservé",
    "serviceSocUp": "SOC de service, régulation à la hausse",
    "serviceSocDown": "SOC de service, régulation à la baisse",
    "maxCycles": "Cycles maximum par an",
    "importPrice": "Électricité achetée",
    "exportPrice": "Solaire vendu (prix spot)",
    "demandCharge": "Facturation de la puissance",
    "payback": "Temps de retour choisi",
    "market": "Marché sélectionné",
    "share": "Part client supposée",
    "horizonNote": "La période de calcul est d'un an. Aucune dégradation, évolution des prix ou taux d'actualisation n'est inclus dans le bénéfice rapporté."
  },
  "ancillary": {
    "title": "Services auxiliaires",
    "product": "Service sélectionné",
    "offered": "Puissance offerte",
    "reservable": "Puissance physiquement réservable (moyenne)",
    "technicalTitle": "Base technique",
    "technicalNote": "La puissance physiquement réservable est une mesure de réservabilité moyenne distincte, et non la puissance servant au calcul de la rémunération.",
    "held": "Puissance retenue (moyenne)",
    "monetized": "Puissance rémunérable estimée",
    "availability": "Disponibilité",
    "limiting": "Facteur limitant",
    "limitingPower": "Puissance de la batterie",
    "limitingEnergy": "Énergie stockée / SOC",
    "limitingGrid": "Capacité du réseau",
    "limitingNone": "Aucune limitation",
    "reservedEnergy": "Énergie réservée",
    "reservedHours": "Heures avec réservation",
    "marketValue": "Valeur de marché estimée",
    "share": "Votre part de la valeur de marché",
    "customerValue": "Votre rémunération estimée",
    "priceBasis": "Base de prix",
    "priceBasisValue": "Prix de marché historiques",
    "nominalPower": "Puissance nominale de la batterie",
    "historicalWarning": "Calcul historique – revenu futur non garanti. La rémunération réelle dépend entre autres des futurs prix du marché, de la disponibilité, des contrats d'agrégation et des règles du marché.",
    "noPriceData": "Aucune valeur économique ne peut être calculée pour ce marché en l'absence de données de prix vérifiées. La puissance et la disponibilité sont calculées, mais aucun revenu n'est affiché.",
    "note": "La participation requiert généralement un agrégateur, une préqualification et une installation agréée. La rémunération réelle dépend du contrat, de l'accès au marché et des conditions."
  },
  "ancillaryOnly": {
    "summaryProposal": "Proposition de dimensionnement technique",
    "summaryBenefit": "Bénéfice total estimé",
    "summaryMaxInvestment": "Investissement maximum pour le temps de retour sur investissement choisi",
    "summaryExplanation": "Le calcul concerne une batterie autonome sans installation solaire. La proposition de dimensionnement technique est basée sur le raccordement au réseau et les exigences techniques du service auxiliaire. Votre consommation est ensuite utilisée pour calculer la réserve qui peut rester disponible et l'indemnisation estimée.",
    "comparisonIntro": "La comparaison montre comment la capacité énergétique de la batterie affecte le bénéfice estimé du service auxiliaire. La proposition technique est basée sur les exigences du service et les limites du raccordement au réseau.",
    "comparisonExplanation": "Les services auxiliaires sont principalement rémunérés en fonction de la puissance qui peut rester disponible. Une fois que la batterie a une capacité énergétique suffisante pour maintenir cette puissance, des kWh supplémentaires n'augmentent pas automatiquement l'indemnisation.",
    "sizingProposal": "Proposition de dimensionnement technique",
    "sizingExplanation": "Le kW indique la puissance que la batterie peut fournir. Le kWh indique l'énergie qu'elle peut stocker. Les services auxiliaires nécessitent une capacité énergétique suffisante pour maintenir la puissance réservée dans le cadre des exigences techniques du service. Une fois cette exigence satisfaite, des kWh supplémentaires n'augmentent pas automatiquement l'indemnisation.",
    "serviceCompensation": "Votre indemnisation estimée",
    "servicePriceBasis": "Base de prix",
    "servicePowerExplanation": "La puissance nominale de la batterie n'est pas automatiquement la même que la puissance qui peut rester disponible et être éligible à une indemnisation. Le calcul tient compte des limites techniques de la batterie, du service auxiliaire et du raccordement au réseau.",
    "investmentExplanation": "L'investissement maximum correspond à l'investissement total pour le temps de retour sur investissement choisi si le bénéfice estimé de la première année se maintenait.",
    "investmentNotAQuote": "Le montant n'est ni un prix de marché estimé, ni un devis, ni une garantie de rentabilité future.",
    "risks": [
      "consommation électrique et profil de charge réels",
      "rendement de la batterie",
      "dégradation de la batterie",
      "disponibilité de la batterie",
      "prix du marché des services auxiliaires",
      "conditions de l'agrégateur et frais éventuels",
      "accès au marché et préqualification",
      "changements des règles du marché",
      "contraintes du réseau"
    ],
    "installer": [
      "Confirmer la capacité de batterie proposée.",
      "Confirmer la puissance de la batterie et de l'onduleur proposée.",
      "Vérifier le fusible principal et le raccordement au réseau.",
      "Vérifier la puissance de charge et de décharge autorisée.",
      "Vérifier les exigences du gestionnaire de réseau.",
      "Vérifier l'installation et le tableau de distribution.",
      "Vérifier le lieu d'installation et la sécurité incendie.",
      "Vérifier les garanties et la durée de vie attendue de la batterie.",
      "Vérifier que la batterie prend en charge le service auxiliaire sélectionné.",
      "Vérifier les exigences de l'agrégateur et de préqualification.",
      "Vérifier les frais de l'agrégateur et le partage des revenus.",
      "Comparer le devis réel avec l'investissement maximum du rapport."
    ],
    "faq": [
      {
        "q": "Que signifient kW et kWh ?",
        "a": "Le kW indique la puissance que la batterie peut fournir. Le kWh indique l'énergie qu'elle peut stocker."
      },
      {
        "q": "Pourquoi cette taille de batterie est-elle recommandée ?",
        "a": "La taille est une proposition de dimensionnement technique basée sur le raccordement au réseau et les exigences techniques du service auxiliaire. Votre consommation est ensuite utilisée pour calculer la réserve qui peut rester disponible et l'indemnisation estimée."
      },
      {
        "q": "Comment l'indemnisation du service auxiliaire est-elle calculée ?",
        "a": "Elle est calculée à partir de la puissance qui peut rester disponible, des prix de marché historiques et de la part client utilisée par le calcul."
      },
      {
        "q": "Pourquoi la puissance de la batterie est-elle supérieure à la puissance indemnisable ?",
        "a": "La puissance nominale de la batterie est contrainte en pratique par la capacité énergétique, le SOC, les exigences d'endurance du service et la marge de manœuvre disponible sur le réseau."
      },
      {
        "q": "Pourquoi une batterie plus grande n'augmente-t-elle pas toujours l'indemnisation ?",
        "a": "Une fois que la batterie peut maintenir la puissance indemnisable selon les exigences techniques du service, une capacité énergétique supplémentaire n'augmente pas automatiquement l'indemnisation."
      },
      {
        "q": "L'indemnisation du service auxiliaire est-elle garantie ?",
        "a": "Non. Elle est basée sur des prix historiques et des hypothèses sur la disponibilité, l'accès au marché et les conditions contractuelles."
      },
      {
        "q": "Ai-je besoin d'un agrégateur ?",
        "a": "Une batterie résidentielle participe normalement via un agrégateur, qui gère habituellement l'accès au marché, la préqualification et le règlement."
      },
      {
        "q": "Que signifie l'investissement maximum ?",
        "a": "C'est l'investissement total correspondant au temps de retour sur investissement choisi si le bénéfice estimé de la première année se maintenait."
      },
      {
        "q": "L'investissement maximum est-il identique au prix de marché de la batterie ?",
        "a": "Non. L'investissement maximum n'est ni un prix de marché estimé, ni un devis."
      },
      {
        "q": "Pourquoi le calcul de l'installateur ou de l'agrégateur peut-il différer ?",
        "a": "Des hypothèses différentes sur les contraintes techniques, les prix, la disponibilité, les frais, la part client et les conditions de marché peuvent produire un résultat différent."
      },
      {
        "q": "Le rapport est-il un devis ?",
        "a": "Non. Le rapport est une aide à la décision et doit être complété par un devis, une inspection technique et les conditions de l'agrégateur."
      }
    ]
  },
  "faq": {
    "title": "Foire aux questions",
    "items": [
      {
        "q": "Que signifient kW et kWh ?",
        "a": "Le kW est la puissance, soit la vitesse à laquelle la batterie peut se charger ou se décharger. Le kWh est l'énergie, soit la quantité qu'elle peut stocker."
      },
      {
        "q": "Pourquoi cette taille de batterie est-elle recommandée ?",
        "a": "Le calcul simule plusieurs tailles et sélectionne celle qui offre le meilleur équilibre entre sa dimension et le bénéfice estimé selon vos paramètres."
      },
      {
        "q": "Que signifie l'autoconsommation ?",
        "a": "La part de la production solaire utilisée sur place au lieu d'être exportée vers le réseau."
      },
      {
        "q": "Que signifie l'autosuffisance ?",
        "a": "La part de la consommation électrique du bâtiment couverte par sa propre électricité au lieu de l'électricité achetée."
      },
      {
        "q": "Qu'est-ce que l'écrêtage des pointes ?",
        "a": "La batterie réduit les pics de puissance les plus élevés, ce qui peut diminuer les coûts liés à la puissance appelée."
      },
      {
        "q": "Comment la rémunération des services système est-elle calculée ?",
        "a": "À partir de la puissance que la batterie peut physiquement maintenir disponible et des prix historiques du marché, moins la part qui ne vous revient pas."
      },
      {
        "q": "Les revenus des services système sont-ils garantis ?",
        "a": "Non. Ils sont basés sur les prix historiques et des hypothèses sur la disponibilité et les conditions contractuelles."
      },
      {
        "q": "Que signifie l'investissement maximal ?",
        "a": "Le coût approximatif maximal de la batterie pour respecter le temps de retour sur investissement que vous avez choisi, compte tenu du bénéfice annuel calculé."
      },
      {
        "q": "L'investissement maximal est-il identique au prix du marché ?",
        "a": "Non. Il n'indique rien sur le coût réel des batteries, mais seulement l'investissement que le calcul justifie."
      },
      {
        "q": "Pourquoi le calcul de l'installateur peut-il être différent ?",
        "a": "Des hypothèses différentes sur les prix, le profil de consommation, l'efficacité, la disponibilité et les services système donnent des résultats différents."
      },
      {
        "q": "Le rapport est-il un devis ?",
        "a": "Non. Le rapport est une aide à la décision et doit être complété par un devis et une évaluation sur site."
      }
    ]
  }
};
