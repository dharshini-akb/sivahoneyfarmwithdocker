
pipeline {
    agent any

    stages {

        stage('Clone Repo') {
    steps {
        git branch: 'main', url: 'https://github.com/dharshini-akb/sivahoneyfarmwithdocker.git'
    }
}

        stage('Terraform Init') {
            steps {
                sh 'cd terraform && terraform init'
            }
        }

        stage('Terraform Apply') {
            steps {
                sh 'cd terraform && terraform apply -auto-approve'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t honeyfarm .'
            }
        }

        stage('Run Docker Container') {
            steps {
                sh 'docker run -d -p 80:80 honeyfarm'
            }
        }
    }
}
