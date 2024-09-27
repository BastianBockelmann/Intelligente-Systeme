import { USE_RECOMMENDATIONSTORE } from '~/stores/recommendation'

export function loadcontent() {

    const recommendations = USE_RECOMMENDATIONSTORE()

    for(const rec of recommendations.recommendations) {

        recommendations.loadContentFromAPI(rec)
    }

}